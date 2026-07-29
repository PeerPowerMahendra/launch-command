import { z } from "zod";

/* ---------------- Campaign Workspace ---------------- */

export const campaignWorkspaceSchema = z.object({
  executive_summary: z.string(),
  persona: z.object({
    name: z.string(),
    age_range: z.string(),
    location: z.string(),
    current_alternatives: z.string(),
    desires: z.string(),
    pain_points: z.string(),
  }),
  meta_ads: z
    .array(
      z.object({
        angle: z.enum(["Hook", "Story", "Offer"]),
        primary_text: z.string(),
        headline: z.string(),
        description: z.string(),
        cta: z.string(),
      })
    )
    .length(3),
  google_ads: z.object({
    headlines: z.array(z.string().max(30)).min(8),
    descriptions: z.array(z.string().max(90)).min(3),
  }),
  email_overview: z
    .array(z.object({ send_timing: z.string(), goal: z.string() }))
    .min(3),
});
export type CampaignWorkspaceOutput = z.infer<typeof campaignWorkspaceSchema>;

/* ---------------- Landing Page ---------------- */

export const landingPageSchema = z.object({
  hero: z.object({
    h1: z.string(),
    subheadline: z.string(),
    cta_text: z.string(),
    microcopy: z.string(),
  }),
  problem: z.string(),
  solution: z.object({
    intro: z.string(),
    bullet_benefits: z.array(z.string()).min(3),
  }),
  social_proof_placeholder: z.string(),
  offer: z.string(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
  final_cta: z.object({ headline: z.string(), cta_text: z.string() }),
});
export type LandingPageOutput = z.infer<typeof landingPageSchema>;

/* ---------------- Email Sequence ---------------- */

export const emailSequenceSchema = z.object({
  emails: z
    .array(
      z.object({
        send_timing: z.string(),
        subject_line: z.string(),
        subject_line_variant_b: z.string(),
        preview_text: z.string(),
        body: z.string(),
        cta: z.string(),
      })
    )
    .min(1),
});
export type EmailSequenceOutput = z.infer<typeof emailSequenceSchema>;
