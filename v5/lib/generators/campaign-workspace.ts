import { GeneratorConfig } from "./types";
import { campaignWorkspaceSchema } from "./schemas";

const config: GeneratorConfig = {
  id: "campaign_workspace",
  label: "Campaign Workspace",
  description: "The strategic anchor: persona, positioning, Meta + Google ads, and an email send-plan.",
  formFields: [],
  system:
    "You are a Principal Marketing Operations Director. You produce tight, specific, non-generic launch strategy grounded in the customer's real problem. You never pad with marketing cliches. You respect exact character limits.",
  buildPrompt: (c) => {
    const audience = c.target_audience?.trim()
      ? c.target_audience.trim()
      : "(not provided — infer who realistically has this exact problem from the product, category, and price point; do NOT default to a generic audience)";
    return `Create the strategic core of a launch campaign for the product below. One persona must run consistently through every asset.

BRIEF
- Product/Brand: ${c.product_name}
- Category: ${c.category}
- Price: ${c.price}
- Launch offer: ${c.offer || "(none specified)"}
- Core problem it solves: ${c.core_problem}
- Unique selling point / mechanism: ${c.usp}
- Target audience: ${audience}
- Brand tone: ${c.brand_tone}

RULES
- executive_summary: one crisp paragraph — the positioning, in plain language.
- persona: derive pain_points directly from the core problem, restated in the customer's own words. Infer age_range, location, current_alternatives (what they use instead), and desires from who realistically has this problem.
- meta_ads: exactly 3, angles in this order — "Hook" (pattern-interrupt), "Story" (relatable trust), "Offer" (conversion closer using the launch offer). Keep primary_text under 125 chars, headline under 40 chars, description under 30 chars.
- google_ads: at least 10 headlines EACH AT MOST 30 CHARACTERS, and at least 4 descriptions EACH AT MOST 90 CHARACTERS. These are hard limits — count characters.
- email_overview: at least 3 items, each a send_timing (e.g. "Day 0 — launch") and a one-line goal. This is a PLAN only, not full copy.
- Match the brand tone in every line.`;
  },
  schema: campaignWorkspaceSchema,
};

export default config;
