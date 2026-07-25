/* ------------------------------------------------------------------ */
/* Generation engine core — shared by v2 (/api/generate) and v3        */
/* (/api/v3/generate).                                                  */
/*                                                                      */
/*   "api"         — Anthropic API via ANTHROPIC_API_KEY (production)   */
/*   "claude-code" — local Claude Code CLI in headless mode (claude -p) */
/*                                                                      */
/* Default is auto: use the API when a key is set, otherwise fall back  */
/* to the local Claude Code install. Override with GENERATION_MODE.     */
/* ------------------------------------------------------------------ */

const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

/* Is the Claude Code CLI (`claude`) on the PATH? Checked once at startup. */
let cliAvailable = null;
function claudeCliAvailable() {
  if (cliAvailable === null) {
    cliAvailable = (process.env.PATH || "").split(path.delimiter).some((dir) => {
      try {
        fs.accessSync(path.join(dir, "claude"), fs.constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });
  }
  return cliAvailable;
}

function generationMode() {
  const forced = (process.env.GENERATION_MODE || "auto").toLowerCase();
  if (forced === "api" || forced === "claude-code" || forced === "demo") return forced;
  if (process.env.ANTHROPIC_API_KEY) return "api";
  if (claudeCliAvailable()) return "claude-code";
  return "demo"; // no AI connected — endpoints serve static sample data instead
}

function httpError(status, message) {
  const e = new Error(message);
  e.httpStatus = status;
  return e;
}

/* Pull the first {...} JSON object out of a text blob (tolerates fences/preamble). */
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(text.slice(start, end + 1));
}

/* ---- Engine 1: Anthropic API (production path) ---- */

async function runViaApi({ system, prompt, schema, maxTokens }) {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: maxTokens,
    system,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "max_tokens") {
    throw httpError(502, "Generation was cut off before completing. Please try again.");
  }
  if (response.stop_reason === "refusal") {
    throw httpError(502, "The model declined to generate copy for this brief.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) throw httpError(502, "The model returned no text output. Please try again.");
  return JSON.parse(textBlock.text);
}

/* ---- Engine 2: local Claude Code CLI (backup / pre-launch path) ---- */

function runViaClaudeCode({ system, prompt, shapeInstructions, timeoutMs }) {
  const fullPrompt = `${system}\n\n${prompt}${shapeInstructions}`;
  const args = ["-p", fullPrompt, "--output-format", "json"];
  if (process.env.CLAUDE_CODE_MODEL) args.push("--model", process.env.CLAUDE_CODE_MODEL);

  return new Promise((resolve, reject) => {
    execFile(
      "claude",
      args,
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          if (err.code === "ENOENT") {
            return reject(httpError(500,
              "Local generation needs the Claude Code CLI (`claude`) on your PATH, " +
              "or add ANTHROPIC_API_KEY to .env to use the Anthropic API instead."));
          }
          if (err.killed) {
            return reject(httpError(504, "Local Claude Code generation timed out. Please try again."));
          }
          const detail = (stderr || err.message || "").toString().trim().slice(0, 300);
          return reject(httpError(502, `Local Claude Code generation failed. ${detail}`));
        }

        try {
          // --output-format json wraps the answer in { result: "<text>", ... }
          const envelope = JSON.parse(stdout);
          const text = typeof envelope.result === "string" ? envelope.result : stdout;
          resolve(extractJson(text));
        } catch {
          try {
            resolve(extractJson(stdout));
          } catch {
            reject(httpError(502, "Local Claude Code returned output that could not be parsed as campaign JSON. Please try again."));
          }
        }
      }
    );
  });
}

/* ---- Unified entry point ---- */

async function runEngine({ system, prompt, schema, shapeInstructions, maxTokens = 16000, timeoutMs = 240000 }) {
  return generationMode() === "api"
    ? runViaApi({ system, prompt, schema, maxTokens })
    : runViaClaudeCode({ system, prompt, shapeInstructions, timeoutMs });
}

/* ------------------------------------------------------------------ */
/* Shared prompt scaffolding                                            */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT =
  "You are a senior direct-response marketing strategist. You write tight, specific, " +
  "non-generic launch copy grounded in the customer's real problem. You follow word " +
  "limits strictly and never pad copy with marketing cliches.";

/* Brief header + persona rules, shared verbatim by v2's buildBrief and v3's buildBriefV3. */
function briefCore(b) {
  const audience = b.audience && b.audience.trim()
    ? b.audience.trim()
    : "(not provided — infer who realistically has this problem from the problem, category, mechanism, and price point)";

  return `Create a complete brand-launch campaign for the product below.

BRIEF
- Product/Brand Name: ${b.name}
- Category: ${b.category}
- Price Point: ${b.price}
- Core Problem It Solves: ${b.problem}
- Signature Mechanism (what makes it different): ${b.mechanism}
- Target Audience: ${audience}
- Main Competitor / Status Quo: ${b.competitor}
- Launch Offer: ${b.offer}
- Brand Tone: ${b.tone}

PERSONA RULES
- Derive persona.pain_point directly from "Core Problem It Solves", restated from the customer's point of view (their frustration, their words) — not the brand's framing.
- Then infer age_range, location, alternative (what they currently do instead), core_desire, and platforms from who would realistically have that exact problem, given the category and price point.
- If a Target Audience was provided, treat it as a constraint layered on top of that inference. If it was not provided, infer the whole persona from the problem/category/mechanism alone — do NOT default to a generic audience.
- persona.name is a realistic first name for the persona. persona.secondary is one sentence naming a plausible secondary audience.`;
}

/* Shared route-level error mapping for generation endpoints. */
function mapEngineError(err, res) {
  if (err.httpStatus) {
    return res.status(err.httpStatus).json({ error: err.message });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return res.status(500).json({
      error: "Anthropic API key is missing or invalid. Add ANTHROPIC_API_KEY to your .env file and restart the server.",
    });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "Rate limited by the Anthropic API. Wait a moment and try again." });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return res.status(502).json({ error: "Could not reach the Anthropic API. Check your internet connection." });
  }
  if (err instanceof Anthropic.APIError) {
    return res.status(502).json({ error: `Anthropic API error (${err.status}): ${err.message}` });
  }
  console.error("Generation failed:", err);
  return res.status(500).json({ error: "Unexpected server error during generation." });
}

module.exports = {
  generationMode,
  runEngine,
  httpError,
  extractJson,
  SYSTEM_PROMPT,
  briefCore,
  mapEngineError,
};
