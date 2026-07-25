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
