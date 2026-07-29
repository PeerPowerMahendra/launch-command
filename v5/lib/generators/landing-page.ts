import { GeneratorConfig } from "./types";
import { landingPageSchema } from "./schemas";

const config: GeneratorConfig = {
  id: "landing_page",
  label: "Landing Page Generator",
  description: "CRO-grade landing page copy using PAS, built for scannability and SEO.",
  formFields: [
    { name: "seo_keywords", label: "SEO keywords", type: "text", placeholder: "comma-separated", help: "Keywords the page should rank for." },
    {
      name: "page_goal",
      label: "Page goal",
      type: "select",
      required: true,
      options: ["Sign up", "Purchase", "Book a demo", "Download", "Join waitlist"],
    },
  ],
  system:
    "You are an Elite Conversion Rate Optimization (CRO) copywriter. You write scannable, benefit-led landing page copy using the Problem-Agitate-Solve framework. Every line earns attention; nothing is filler.",
  buildPrompt: (c, extra) =>
    `Write landing-page copy for the product below, optimized for the goal "${extra.page_goal || "Sign up"}".

BRIEF
- Product/Brand: ${c.product_name}
- Category: ${c.category}
- Price: ${c.price}
- Launch offer: ${c.offer || "(none specified)"}
- Core problem: ${c.core_problem}
- Unique selling point: ${c.usp}
- Target audience: ${c.target_audience?.trim() || "(infer from the problem and category)"}
- Brand tone: ${c.brand_tone}
- SEO keywords to weave in naturally: ${extra.seo_keywords?.trim() || "(none — write naturally)"}

RULES
- hero.h1: lead with the ultimate emotional benefit, not the tech. hero.subheadline: explain the mechanism and validate the H1. hero.cta_text: high-value, low-friction. hero.microcopy: one reassuring line under the button to lower signup anxiety.
- problem: agitate the daily pain, visceral and relatable (the P and A of PAS).
- solution.intro: introduce the product as the definitive cure. solution.bullet_benefits: at least 3 punchy, scannable benefits.
- offer: restate the offer as a reason to act now.
- faq: at least 3 real objections with honest answers.
- final_cta: a closing headline + button text.
- Match the brand tone; keep sentences short and scannable.`,
  schema: landingPageSchema,
};

export default config;
