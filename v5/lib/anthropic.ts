import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { stripCodeFences } from "./utils";
import type { CampaignInput, GeneratorConfig } from "./generators/types";

export const MODEL = "claude-sonnet-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new GenerationError(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart.",
      500
    );
  }
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

export function isGenerationConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function callModel(system: string, prompt: string): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: `${system}\n\nRespond with ONLY a single valid JSON object. No markdown fences, no prose before or after.`,
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "max_tokens") throw new GenerationError("Generation was cut off. Try again.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new GenerationError("The model returned no text.");
  return block.text;
}

/**
 * The generic engine every generator shares.
 * form → prompt → Claude → strip fences → zod-validate → one auto-retry.
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
    const output = await attempt();
    return { output, tokensUsed: 0 };
  } catch (err) {
    if (err instanceof GenerationError) throw err;
    // one auto-retry with a corrective nudge
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
