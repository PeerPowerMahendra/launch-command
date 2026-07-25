require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  generationMode,
  runEngine,
  SYSTEM_PROMPT,
  briefCore,
  mapEngineError,
} = require("./engine");
const { buildDemoCampaign } = require("./demo-campaign");

/* v3 is local work-in-progress and not part of the published repo —
   mount it only when its files are present. */
let createV3Router = null;
try {
  createV3Router = require("./routes-v3");
} catch {
  createV3Router = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const BOARD_FILE = path.join(DATA_DIR, "board.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ------------------------------------------------------------------ */
/* v2 campaign generation (contract unchanged)                          */
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

function buildBrief(b) {
  return `${briefCore(b)}

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

  // No AI connected — serve the static sample campaign; the frontend
  // shows a "no AI connected" popup when it sees the demo flag.
  if (generationMode() === "demo") {
    return res.json({ ...buildDemoCampaign(b), demo: true });
  }

  try {
    const campaign = await runEngine({
      system: SYSTEM_PROMPT,
      prompt: buildBrief(b),
      schema: CAMPAIGN_SCHEMA,
      shapeInstructions: JSON_SHAPE_INSTRUCTIONS,
    });

    if (!campaign || typeof campaign !== "object" ||
        !Array.isArray(campaign.ads) || campaign.ads.length !== 3 ||
        !Array.isArray(campaign.emails) || campaign.emails.length !== 3 ||
        !campaign.persona || !campaign.positioning) {
      return res.status(502).json({ error: "The model returned an incomplete campaign. Please try again." });
    }

    res.json(campaign);
  } catch (err) {
    mapEngineError(err, res);
  }
});

/* ------------------------------------------------------------------ */
/* v3 API                                                               */
/* ------------------------------------------------------------------ */

if (createV3Router) app.use("/api/v3", createV3Router({ DATA_DIR }));

/* ------------------------------------------------------------------ */
/* Kanban board persistence (v2, unchanged)                             */
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
  console.log(`  v2 workspace:  http://localhost:${PORT}/`);
  if (createV3Router) console.log(`  v3 suite:      http://localhost:${PORT}/v3/`);
  console.log(
    mode === "api"
      ? "Generation engine: Anthropic API (claude-sonnet-5)"
      : mode === "claude-code"
        ? "Generation engine: local Claude Code CLI (no API key needed — add ANTHROPIC_API_KEY to .env to switch to the API)"
        : "Generation engine: DEMO MODE — no AI connected. Generate serves static sample data. Install the Claude Code CLI or add ANTHROPIC_API_KEY to .env for real generation."
  );
});
