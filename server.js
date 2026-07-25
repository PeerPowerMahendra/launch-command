require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const BOARD_FILE = path.join(DATA_DIR, "board.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ------------------------------------------------------------------ */
/* Generation engine selection                                          */
/*                                                                      */
/*   "api"         — Anthropic API via ANTHROPIC_API_KEY (production)   */
/*   "claude-code" — local Claude Code CLI in headless mode (`claude -p`)*/
/*                                                                      */
/* Default is auto: use the API when a key is set, otherwise fall back  */
/* to the local Claude Code install. Override with GENERATION_MODE.     */
/* ------------------------------------------------------------------ */

function generationMode() {
  const forced = (process.env.GENERATION_MODE || "auto").toLowerCase();
  if (forced === "api" || forced === "claude-code") return forced;
  return process.env.ANTHROPIC_API_KEY ? "api" : "claude-code";
}

const client = new Anthropic();

/* ------------------------------------------------------------------ */
/* Campaign schema + prompts                                            */
/* ------------------------------------------------------------------ */

const CAMPAIGN_SCHEMA = {
  type: "object",
  properties: {
    persona: {
      type: "object",
      properties: {
        name: { type: "string" },
        age_range: { type: "string" },
        location: { type: "string" },
        pain_point: { type: "string" },
        alternative: { type: "string" },
        core_desire: { type: "string" },
        platforms: { type: "string" },
        secondary: { type: "string" },
      },
      required: [
        "name",
        "age_range",
        "location",
        "pain_point",
        "alternative",
        "core_desire",
        "platforms",
        "secondary",
      ],
      additionalProperties: false,
    },
    positioning: { type: "string" },
    ads: {
      type: "array",
      items: {
        type: "object",
        properties: {
          primary_text: { type: "string" },
          headline: { type: "string" },
          description: { type: "string" },
          visual: { type: "string" },
          cta: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["primary_text", "headline", "description", "visual", "cta", "rationale"],
        additionalProperties: false,
      },
    },
    emails: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string" },
          preview: { type: "string" },
          goal: { type: "string" },
          body: { type: "string" },
          cta: { type: "string" },
        },
        required: ["subject", "preview", "goal", "body", "cta"],
        additionalProperties: false,
      },
    },
  },
  required: ["persona", "positioning", "ads", "emails"],
  additionalProperties: false,
};

const SYSTEM_PROMPT =
  "You are a senior direct-response marketing strategist. You write tight, specific, " +
  "non-generic launch copy grounded in the customer's real problem. You follow word " +
  "limits strictly and never pad copy with marketing cliches.";

function buildBrief(b) {
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
- persona.name is a realistic first name for the persona. persona.secondary is one sentence naming a plausible secondary audience.

CAMPAIGN RULES
- ads must contain exactly 3 items:
  - ads[0]: Hook-led pattern-interrupt angle.
  - ads[1]: Story-led trust/relatability angle.
  - ads[2]: Offer-led conversion-closer angle that uses the launch offer.
- emails must contain exactly 3 items:
  - emails[0]: launch Announcement.
  - emails[1]: Benefit Deep-Dive — explains the signature mechanism and handles one likely objection.
  - emails[2]: Urgency/Scarcity — uses the deadline/launch offer.
- positioning is a single crisp positioning statement contrasting against the competitor/status quo.
- Each ad's "visual" is a one-sentence creative direction; "rationale" is one sentence on why that angle works for this persona.
- Match the requested brand tone in every piece of copy.

STRICT WORD LIMITS
- headline: under 8 words
- ad primary_text: under 32 words
- ad description: under 14 words
- email subject: under 9 words
- email body: under 26 words`;
}

/* The CLI path has no structured-output enforcement, so spell the JSON shape out. */
const JSON_SHAPE_INSTRUCTIONS = `

OUTPUT FORMAT — CRITICAL
Respond with ONLY a single strict JSON object. No markdown fences, no commentary, no text before or after. It must match this exact shape:
{
  "persona": { "name": "", "age_range": "", "location": "", "pain_point": "", "alternative": "", "core_desire": "", "platforms": "", "secondary": "" },
  "positioning": "",
  "ads": [
    { "primary_text": "", "headline": "", "description": "", "visual": "", "cta": "", "rationale": "" },
    { "primary_text": "", "headline": "", "description": "", "visual": "", "cta": "", "rationale": "" },
    { "primary_text": "", "headline": "", "description": "", "visual": "", "cta": "", "rationale": "" }
  ],
  "emails": [
    { "subject": "", "preview": "", "goal": "", "body": "", "cta": "" },
    { "subject": "", "preview": "", "goal": "", "body": "", "cta": "" },
    { "subject": "", "preview": "", "goal": "", "body": "", "cta": "" }
  ]
}`;

/* ------------------------------------------------------------------ */
/* Engine 1 — Anthropic API (production path)                           */
/* ------------------------------------------------------------------ */

async function generateViaApi(brief) {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: CAMPAIGN_SCHEMA } },
    messages: [{ role: "user", content: brief }],
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

/* ------------------------------------------------------------------ */
/* Engine 2 — local Claude Code CLI (backup / pre-launch path)          */
/* ------------------------------------------------------------------ */

function generateViaClaudeCode(brief) {
  const prompt = `${SYSTEM_PROMPT}\n\n${brief}${JSON_SHAPE_INSTRUCTIONS}`;
  const args = ["-p", prompt, "--output-format", "json"];
  if (process.env.CLAUDE_CODE_MODEL) args.push("--model", process.env.CLAUDE_CODE_MODEL);

  return new Promise((resolve, reject) => {
    execFile(
      "claude",
      args,
      { timeout: 240000, maxBuffer: 16 * 1024 * 1024 },
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
          // Fall back to extracting JSON straight from stdout
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

/* Pull the first {...} JSON object out of a text blob (tolerates fences/preamble). */
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(text.slice(start, end + 1));
}

function httpError(status, message) {
  const e = new Error(message);
  e.httpStatus = status;
  return e;
}

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

app.get("/api/status", (req, res) => {
  res.json({ mode: generationMode() });
});

app.post("/api/generate", async (req, res) => {
  const b = req.body || {};
  const required = ["name", "category", "price", "problem", "mechanism", "competitor", "offer", "tone"];
  const missing = required.filter((k) => !b[k] || !String(b[k]).trim());
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
  }

  const brief = buildBrief(b);
  const mode = generationMode();

  try {
    const campaign = mode === "api"
      ? await generateViaApi(brief)
      : await generateViaClaudeCode(brief);

    if (!campaign || typeof campaign !== "object" ||
        !Array.isArray(campaign.ads) || campaign.ads.length !== 3 ||
        !Array.isArray(campaign.emails) || campaign.emails.length !== 3 ||
        !campaign.persona || !campaign.positioning) {
      return res.status(502).json({ error: "The model returned an incomplete campaign. Please try again." });
    }

    res.json(campaign);
  } catch (err) {
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
    res.status(500).json({ error: "Unexpected server error during generation." });
  }
});

/* ------------------------------------------------------------------ */
/* Kanban board persistence                                             */
/* ------------------------------------------------------------------ */

const SEED_TASKS = [
  { id: "t1",  title: "Approve Ad Variant A (hook-led)",       type: "AD",      priority: "Highest", owner: "MK", due: "2026-08-03", column: "todo" },
  { id: "t2",  title: "Load email sequence into ESP",          type: "EMAIL",   priority: "High",    owner: "AR", due: "2026-08-04", column: "todo" },
  { id: "t3",  title: "Set UTM parameters for all links",      type: "OPS",     priority: "High",    owner: "MK", due: "2026-08-04", column: "todo" },
  { id: "t4",  title: "Build landing page + mobile QA",        type: "OPS",     priority: "Highest", owner: "JS", due: "2026-08-05", column: "inprogress" },
  { id: "t5",  title: "Cut 3-second hook edit for Reels",      type: "CONTENT", priority: "High",    owner: "PT", due: "2026-08-05", column: "inprogress" },
  { id: "t6",  title: "Proof Email 1 (Announcement) copy",     type: "EMAIL",   priority: "Medium",  owner: "AR", due: "2026-08-06", column: "inreview" },
  { id: "t7",  title: "Verify pixel + conversion events",      type: "OPS",     priority: "High",    owner: "JS", due: "2026-08-06", column: "inreview" },
  { id: "t8",  title: "Connect KPI dashboard",                 type: "OPS",     priority: "Medium",  owner: "MK", due: "2026-08-02", column: "done" },
  { id: "t9",  title: "Brand tone one-pager",                  type: "CONTENT", priority: "Low",     owner: "PT", due: "2026-08-01", column: "done" },
  { id: "t10", title: "Draft UGC brief for creators",          type: "CONTENT", priority: "Medium",  owner: "PT", due: "2026-08-10", column: "backlog" },
  { id: "t11", title: "Collect testimonials for social proof", type: "CONTENT", priority: "Medium",  owner: "AR", due: "2026-08-12", column: "backlog" },
  { id: "t12", title: "Plan post-launch retro",                type: "OPS",     priority: "Low",     owner: "MK", due: "2026-08-20", column: "backlog" },
];

function writeBoard(tasks) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BOARD_FILE, JSON.stringify({ tasks }, null, 2));
}

function readBoard() {
  if (!fs.existsSync(BOARD_FILE)) writeBoard(SEED_TASKS);
  try {
    return JSON.parse(fs.readFileSync(BOARD_FILE, "utf8"));
  } catch {
    writeBoard(SEED_TASKS);
    return { tasks: SEED_TASKS };
  }
}

app.get("/api/board", (req, res) => {
  res.json(readBoard());
});

app.put("/api/board", (req, res) => {
  const { tasks } = req.body || {};
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: "Body must be { tasks: [...] }" });
  }
  writeBoard(tasks);
  res.json({ ok: true });
});

app.post("/api/board/reset", (req, res) => {
  writeBoard(SEED_TASKS);
  res.json({ tasks: SEED_TASKS });
});

/* ------------------------------------------------------------------ */

app.listen(PORT, () => {
  const mode = generationMode();
  console.log(`Launch Command running at http://localhost:${PORT}`);
  console.log(
    mode === "api"
      ? "Generation engine: Anthropic API (claude-sonnet-5)"
      : "Generation engine: local Claude Code CLI (no API key needed — add ANTHROPIC_API_KEY to .env to switch to the API)"
  );
});
