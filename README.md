# Launch Command

A brand-launch campaign workspace: an AI copy generator, an editable campaign document, and a Jira-style Kanban task board — all in one scrollable page.

- **Frontend:** plain HTML/CSS/JS (`public/`), no build step.
- **Backend:** small Express server (`server.js`) that (a) generates campaigns with Claude, and (b) persists the Kanban board to `data/board.json`.

## Two generation engines — local now, API when you go public

The server picks its engine automatically at startup:

| Engine | When it's used | Cost | Setup |
|---|---|---|---|
| **Local Claude Code CLI** | Default — no API key present | Covered by your Claude Code subscription | None. Works today if `claude` is installed. |
| **Anthropic API** (`claude-sonnet-5`) | `ANTHROPIC_API_KEY` is set in `.env` | Pay-per-token | Paste your key in `.env`, restart. |

**Pre-launch workflow (now):** just run the app — it shells out to your local `claude` CLI in headless mode. No key, no per-call cost.

**Go-public workflow (later):** `cp .env.example .env`, paste your key from https://platform.claude.com, restart. The server switches to the API automatically — no code changes. The API path uses structured outputs, so the campaign JSON is schema-guaranteed.

Check which engine is live: the startup log prints it, or `curl localhost:3000/api/status`. Force one with `GENERATION_MODE=api` or `GENERATION_MODE=claude-code` in `.env`.

## Run it

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. (`npm run dev` auto-restarts on file changes; `npm start` for a plain run; set `PORT` in `.env` to change the port.)

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 00 | **Generate Campaign** | Product brief form → one click generates persona, positioning, ads, and emails. Target Audience is optional — leave it blank and the AI infers who has the problem. "Try an example" autofills a sample brief. |
| 01 | **Executive Campaign Summary** | AI-populated persona + positioning statement; KPI targets are manual amber-chip inputs (business decisions, not creative ones). |
| 02 | **Direct-Response Ad Matrix** | Three ad angles side by side: Hook-led, Story-led, Offer-led — each with copy, visual direction, CTA, and rationale. |
| 03 | **Lifecycle Email Blueprint** | Three-email launch timeline: Announcement (launch day), Benefit Deep-Dive (+2 days), Urgency/Scarcity (final 48h). |
| 04 | **Content Distribution Log** | Pre-seeded map of each asset to its repurposed format/platform; cadence cells are editable chips. |
| 05 | **Task Board** | 5-column Kanban with drag-and-drop, inline editing, type/priority chips, owners, due dates. Every change persists to the backend (`data/board.json`). "Reset board to defaults" restores the seed tasks. |

## Notes for future me

- All AI-generated text is directly editable — click any line and type. Dashed **amber chips** mean "you still need to fill this in"; plain text means "AI already wrote this."
- If a regeneration fails, the previous copy is kept but modules 01–03 get a **Stale** badge so old data is never silently mistaken for fresh output.
- Local engine can take **1–2 minutes** per generation (it's a full Claude Code headless run); the API engine is faster (~20s).
- Board data lives in `data/board.json` (gitignored). Delete the file to force a re-seed, or use the Reset button.
- To tweak the generation prompt/word limits, edit `SYSTEM_PROMPT`, `buildBrief()`, and `CAMPAIGN_SCHEMA` in `server.js`. `CLAUDE_CODE_MODEL` in `.env` picks the local engine's model (e.g. `sonnet`, `opus`, `haiku`).
