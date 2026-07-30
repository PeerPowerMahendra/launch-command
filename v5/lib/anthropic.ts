import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { stripCodeFences } from "./utils";
import type { CampaignInput, GeneratorConfig } from "./generators/types";

export const MODEL = "claude-sonnet-5";

export type EngineMode = "api" | "claude-code" | "none";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export class GenerationError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

/* ── engine selection ─────────────────────────────────────────────
   "api"         → Anthropic API via ANTHROPIC_API_KEY (production)
   "claude-code" → local Claude Code CLI (`claude -p`), free, no key
   Auto: API if a key is set, else the CLI if it's on PATH.
   Override with GENERATION_MODE=api|claude-code.
   ------------------------------------------------------------------ */

let _cliAvailable: boolean | null = null;
function claudeCliAvailable(): boolean {
  if (_cliAvailable === null) {
    _cliAvailable = (process.env.PATH || "").split(path.delimiter).some((dir) => {
      try {
        fs.accessSync(path.join(dir, "claude"), fs.constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });
  }
  return _cliAvailable;
}

export function generationMode(): EngineMode {
  const forced = (process.env.GENERATION_MODE || "auto").toLowerCase();
  if (forced === "api") return "api";
  if (forced === "claude-code") return "claude-code";
  if (process.env.ANTHROPIC_API_KEY) return "api";
  if (claudeCliAvailable()) return "claude-code";
  return "none";
}

export function isGenerationConfigured(): boolean {
  return generationMode() !== "none";
}

/* ── engine 1: Anthropic API ──────────────────────────────────── */

async function callViaApi(system: string, prompt: string): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "max_tokens") throw new GenerationError("Generation was cut off. Try again.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new GenerationError("The model returned no text.");
  return block.text;
}

/* ── engine 2: local Claude Code CLI ──────────────────────────── */

function callViaClaudeCode(system: string, prompt: string): Promise<string> {
  const full = `${system}\n\n${prompt}`;
  const args = ["-p", full, "--output-format", "json"];
  if (process.env.CLAUDE_CODE_MODEL) args.push("--model", process.env.CLAUDE_CODE_MODEL);

  return new Promise((resolve, reject) => {
    execFile("claude", args, { timeout: 240_000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT")
          return reject(new GenerationError("Claude Code CLI (`claude`) not found on PATH. Install it or set ANTHROPIC_API_KEY.", 500));
        if ((err as { killed?: boolean }).killed)
          return reject(new GenerationError("Local Claude Code generation timed out. Try again.", 504));
        return reject(new GenerationError(`Local Claude Code failed. ${(stderr || err.message).slice(0, 240)}`, 502));
      }
      try {
        // `--output-format json` wraps the answer as { result: "<text>", ... }
        const envelope = JSON.parse(stdout);
        resolve(typeof envelope.result === "string" ? envelope.result : stdout);
      } catch {
        resolve(stdout);
      }
    });
  });
}

/* ── unified call ─────────────────────────────────────────────── */

async function callModel(system: string, prompt: string): Promise<string> {
  const sys = `${system}\n\nRespond with ONLY a single valid JSON object. No markdown fences, no prose before or after.`;
  const mode = generationMode();
  if (mode === "none")
    throw new GenerationError("No generation engine available. Add ANTHROPIC_API_KEY or install the Claude Code CLI.", 503);
  return mode === "api" ? callViaApi(sys, prompt) : callViaClaudeCode(sys, prompt);
}

/**
 * The generic engine every generator shares.
 * form → prompt → engine (API or local CLI) → strip fences → zod-validate → one auto-retry.
 */
export async function runGenerator<T>(
  cfg: GeneratorConfig<T>,
  campaign: CampaignInput,
  extra: Record<string, string> = {}
): Promise<{ output: T; tokensUsed: number }> {
  const prompt = cfg.buildPrompt(campaign, extra);

  const attempt = async (extraNote = ""): Promise<T> => {
    const raw = await callModel(cfg.system, prompt + extraNote);
    const parsed = JSON.parse(stripCodeFences(raw));
    return (cfg.schema as z.ZodType<T>).parse(parsed);
  };

  try {
    return { output: await attempt(), tokensUsed: 0 };
  } catch (err) {
    if (err instanceof GenerationError) throw err;
    try {
      const output = await attempt(
        "\n\nYour previous response was not valid JSON matching the schema. Return ONLY the corrected JSON object, respecting every field and character limit."
      );
      return { output, tokensUsed: 0 };
    } catch {
      throw new GenerationError("The model did not return valid campaign JSON after a retry. Please try again.");
    }
  }
}

export function mapAnthropicError(err: unknown): GenerationError {
  if (err instanceof GenerationError) return err;
  if (err instanceof Anthropic.AuthenticationError)
    return new GenerationError("Anthropic API key is missing or invalid.", 500);
  if (err instanceof Anthropic.RateLimitError)
    return new GenerationError("Rate limited by the Anthropic API. Wait a moment and retry.", 429);
  if (err instanceof Anthropic.APIError)
    return new GenerationError(`Anthropic API error (${err.status}): ${err.message}`, 502);
  return new GenerationError("Unexpected error during generation.", 500);
}
