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

## Never used a terminal? Start here — the complete beginner guide

You don't need to know anything about coding. Follow these steps exactly, in order. Total time: about 10 minutes, once.

### Step 1 — Install Node.js (one time only)

Node.js is the free program that runs this app.

1. Go to **https://nodejs.org** in your browser.
2. Click the big green button that says **LTS** (that's the stable version) and download it.
3. Open the downloaded file and click **Continue / Next** through the installer, like any other app.

### Step 2 — Open the Terminal

The Terminal is a window where you type commands instead of clicking buttons. It looks scary; you will only ever type three things.

- **Mac:** press `Cmd + Space`, type `Terminal`, press Enter.
- **Windows:** press the Windows key, type `PowerShell`, press Enter.

### Step 3 — Go to this folder

In the Terminal, type `cd ` (that's c, d, then **one space**) — then **drag this project's folder from Finder/Explorer straight into the Terminal window**. The folder's path appears automatically. Press Enter.

> `cd` just means "change directory" — you're telling the Terminal which folder to work in.

### Step 4 — Install and start (the only commands you'll ever need)

Type this and press Enter (first time only — it downloads the app's parts, takes a minute):

```
npm install
```

Then type this and press Enter (this is the one you'll use every time):

```
npm run dev
```

When you see `Launch Command running at http://localhost:3000`, it's working. **Leave the Terminal window open** — closing it stops the app.

### Step 5 — Open the app

Open your normal browser (Chrome, Safari…) and go to:

```
http://localhost:3000
```

"localhost" means *this computer* — the app runs entirely on your machine; nothing is on the internet.

### Your first 5 minutes — a guided tour

1. You land on **V2**, the classic workspace. Click **"Try an example"** — the form fills itself with a sample product (a sleep mask called Driftwell).
2. Click **"Generate campaign"** and wait. On the free local engine this takes **1–2 minutes** (V3 takes 2–5 — the button tells you what it's doing while you wait). If a popup says **"No AI is connected"**, you're in Demo mode — see the section above.
3. When the copy appears: **click any sentence and just type** — everything the AI wrote is editable, like a document.
4. Find the small **V2 | V3 pill** in the corner and click **V3**. This is the new multi-platform version:
   - **Landing page** — what customers would see.
   - **Workspace** (`Open the workspace`) — generate here too, then flip between the **Meta / Google / TikTok tabs** to see the same brief written natively for each platform. Scroll down to **KPI Targets** and click the dashed amber chips to type your goals (e.g. `50k`, `3.0×`).
   - **Launch console** — click **Connect** on the three ad accounts (it's simulated — nothing real happens), tick a few ads, press **Launch selected**, and watch them go live step by step. The **Analytics** section starts counting and compares results against the KPI targets you typed.
5. To stop the app: click on the Terminal window and press `Ctrl + C`. To start it again tomorrow: `npm run dev`.

### When something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| `Error: listen EADDRINUSE ... port 3000` | The app is already running somewhere (maybe another Terminal window). | Close the other window, or type `kill $(lsof -ti :3000)` and press Enter, then `npm run dev` again. |
| Browser says "can't connect" / "site can't be reached" | The app isn't running. | Go to the Terminal and run `npm run dev`. Keep that window open. |
| `command not found: npm` | Node.js isn't installed (or the Terminal was open during install). | Do Step 1, then **close and reopen** the Terminal. |
| The Generate button spins for ages | Normal on the free local engine — V3 writes a lot of copy. | Wait up to 5 minutes; the button shows a live timer. The paid API engine takes ~30 seconds. |
| "No AI is connected" popup | Demo mode — the page filled with sample text, not text written for your brief. | See **"Connecting a real AI"** above. The sample is still fine for exploring the app. |
| You edited something and want it back | There's no undo across generations. | Click **Generate campaign** again for a fresh draft (your KPI targets are kept). |

**Is any of this on the internet?** No. Campaigns are saved as files in the `data/` folder on your computer, ad accounts and launches in V3 are simulated, and the only thing that ever leaves your machine is your product brief being sent to the AI when you generate (and even that stays local if you use the Claude Code engine).

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
