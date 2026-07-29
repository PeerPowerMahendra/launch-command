import { GeneratorConfig } from "./types";
import { emailSequenceSchema } from "./schemas";

const config: GeneratorConfig = {
  id: "email_sequence",
  label: "Email Generator",
  description: "Full, ready-to-send lifecycle email copy for a complete sequence.",
  formFields: [
    {
      name: "sequence_type",
      label: "Sequence type",
      type: "select",
      required: true,
      options: ["Welcome", "Abandoned cart", "Promotional", "Re-engagement", "Newsletter", "Educational"],
    },
    { name: "email_count", label: "Number of emails", type: "number", placeholder: "3", required: true },
    { name: "tone", label: "Tone", type: "text", placeholder: "warm, artisanal, helpful" },
  ],
  system:
    "You are a Senior Lifecycle Marketing Manager and email copywriter. You write personalized, behavior-aware email copy that is helpful, never pushy, with subject lines that avoid cheesy sales language.",
  buildPrompt: (c, extra) => {
    const count = Math.max(1, Math.min(7, parseInt(extra.email_count || "3", 10) || 3));
    return `Write a complete ${extra.sequence_type || "Welcome"} email sequence of exactly ${count} email(s) for the product below.

BRIEF
- Product/Brand: ${c.product_name}
- Category: ${c.category}
- Price: ${c.price}
- Launch offer: ${c.offer || "(none specified)"}
- Core problem: ${c.core_problem}
- Unique selling point: ${c.usp}
- Target audience: ${c.target_audience?.trim() || "(infer from the problem and category)"}
- Brand tone: ${extra.tone?.trim() || c.brand_tone}

RULES
- Produce exactly ${count} email(s) in "emails", in send order.
- Each email: send_timing (e.g. "Send 1 hour after signup"), subject_line and a genuinely different subject_line_variant_b (A/B test — different strategy, not a reword), preview_text, full body, and a cta.
- Use {{First_Name}} placeholders where a name would appear. For cart/checkout sequences also use {{Cart_Items_Summary}}.
- Match the sequence type's job (e.g. welcome = orient + first value; abandoned cart = helpfulness then soft urgency; re-engagement = win-back).
- Keep it warm and human. No exclamation-mark spam.`;
  },
  schema: emailSequenceSchema,
};

export default config;
