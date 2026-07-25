# Launch Command

A one-page workspace for planning a product launch. Fill in a short form about your product, press **Generate campaign**, and the app drafts:

- a customer persona (who you're selling to),
- a positioning statement,
- three ad variants,
- a three-email launch sequence.

Every line it writes stays editable — just click on the text and type. There's also a drag-and-drop task board at the bottom to manage the launch work.

## How to run it

1. **One-time setup:** install [Node.js](https://nodejs.org) (the free "LTS" version), then open the Terminal app, go to this folder, and type:

   ```
   npm install
   ```

2. **Start the app:**

   ```
   npm start
   ```

3. Open **http://localhost:3000** in your browser. That's it.

To stop the app, go back to the Terminal and press `Ctrl + C`.

## No AI connected? It still works — in Demo mode

If the app can't find an AI to write with, it switches to **Demo mode**:

- The **Generate campaign** button still works, but it fills the page with **static sample data** instead of copy written for your brief.
- A popup appears saying **"No AI is connected"**, so you always know you're looking at a sample, not real generated copy.
- The badge at the bottom of the sidebar shows **Engine · Demo (no AI)**.

Demo mode is perfect for trying the app or showing it to someone without any setup.

## Connecting a real AI (optional)

There are two ways — the app picks one automatically when you restart it:

1. **Claude Code CLI** — if the `claude` command is installed on this computer, the app uses it automatically. No key, no extra cost beyond your Claude subscription.
2. **Anthropic API key** — copy the file `.env.example` to a new file named `.env`, paste your key from https://platform.claude.com inside it, and restart the app. This is pay-per-use.

The app checks in this order: API key → Claude Code CLI → Demo mode. The sidebar badge always tells you which engine is active.

## Two versions, one toggle

A floating **V2 | V3** pill in the corner of every page switches between the two versions. Both run from the same server; nothing to configure.

- **V2 — Classic workspace** at `/` : the original one-page app described above (brief → persona, 3 ads, 3 emails, KPI table, distribution log, task board).
- **V3 — Multi-platform launch suite** at `/v3/` : the AdManage-style product experience, in three pages:

| Page | URL | What it does |
|---|---|---|
| Landing | `/v3/` | Dark marketing site — hero, platform strip, time comparison, features, pricing, FAQ. All testimonials are fictional. |
| Workspace | `/v3/app/` | Brief once → **platform-native ads** in tabs: 3 Meta variants, 1 Google RSA (10 headlines + 4 descriptions with live char counters and a Shuffle preview), 3 TikTok scripts (3-second hooks) — plus persona, positioning, 3 emails, and manual **KPI targets**. Everything inline-editable and auto-saved. |
| Launch console | `/v3/launch/` | **Simulated** launch pipeline: connect mock ad accounts, select units, launch — items cascade through Validating → Uploading → Policy review → Learning → Live. Analytics grow over time (deterministic, refresh-proof) and compare against your KPI targets. Real platform APIs are stubbed for later. |

**v3 generation on the local engine takes 2–5 minutes** (it writes ~4× more copy than v2); on the API engine ~30 seconds. Demo mode fills v3 instantly with sample data.

v3 data lives in `data/v3-*.json` (campaign, mock accounts, launches). "Reset simulation" in the launch console clears accounts + launches. The `/api/generate` and board APIs used by v2 are untouched — v3 is purely additive (`engine.js` is the shared generation core, `routes-v3.js` + `v3-campaign.js` are the v3 backend).
