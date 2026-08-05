import type { CampaignInput, PageType } from "./generators/types";

/**
 * Static sample output shown in "demo" mode (no AI engine connected).
 * Same shape as each generator's schema so the real output UI renders it
 * exactly like a live generation. Product name + offer are substituted in
 * so the demo still feels tied to whatever brief was entered.
 */
export function buildDemoOutput(pageType: PageType, c: CampaignInput): unknown {
  const name = (c.product_name || "").trim() || "Your Product";
  const offer = (c.offer || "").trim() || "the launch offer";
  const short = name.length > 22 ? name.slice(0, 22) : name;

  if (pageType === "campaign_workspace") {
    return {
      executive_summary: `${name} is for people who are done settling for the status quo — it fixes the real problem instead of masking it, and says so in plain language.`,
      persona: {
        name: "Maya",
        age_range: "28–42",
        location: "Urban & suburban, mobile-first",
        current_alternatives: "Cheap quick fixes and whatever the market leader sells",
        desires: "A solution that finally works without constant effort or second-guessing",
        pain_points: "I've tried the obvious fixes and none of them stick — I'm tired of wasting money on things that half-work.",
      },
      meta_ads: [
        { angle: "Hook", primary_text: `Still putting up with the same problem? ${short} was built for the moment you decide you're done.`, headline: "Stop tolerating it. Fix it.", description: "The fix that holds up.", cta: "Learn More" },
        { angle: "Story", primary_text: `"I'd tried everything before ${short}. Two weeks in, I stopped thinking about the problem." Real relief, no gimmicks.`, headline: "It finally just worked", description: "From a skeptic like you.", cta: "See the story" },
        { angle: "Offer", primary_text: `Launch week only: ${offer}. If you've waited for the right moment to fix this, it's now.`, headline: "Launch offer ends soon", description: "Claim it before it's gone.", cta: "Get the offer" },
      ],
      google_ads: {
        headlines: ["Fix It, Don't Mask It", "The Fix That Holds", "Built for Real Life", "Works From Day One", "No More Half-Measures", "Loved by Early Users", "Launch Week: Save Big", "Free Extra This Week", "30-Day Guarantee", "Try It Risk-Free"],
        descriptions: [
          "The mechanism goes after the cause, not the symptom. Feel the difference from day one.",
          "Tried everything? This was built for exactly that. Simple, proven, no gimmicks.",
          "Launch pricing won't last. Claim the offer before the window closes this week.",
          "Real customers, real results. See why early users say it finally just works.",
        ],
      },
      email_overview: [
        { send_timing: "Day 0 — launch", goal: "Announce the launch, plant the hook, drive first visit." },
        { send_timing: "Day 2 — deep-dive", goal: "Explain the mechanism and handle the top objection." },
        { send_timing: "Day 5 — urgency", goal: "Close the launch offer with a clear deadline." },
      ],
    };
  }

  if (pageType === "landing_page") {
    return {
      hero: {
        h1: `Finally fix it — without the guesswork`,
        subheadline: `${name} goes after the cause, not the symptom, so the problem stops coming back.`,
        cta_text: "Start now",
        microcopy: "No card required · 30-day guarantee",
      },
      problem: "You've bought the quick fixes. They work for a week, then you're back where you started — out of pocket and still dealing with it.",
      solution: {
        intro: `${name} is the definitive fix: it targets the real cause and holds up in daily life.`,
        bullet_benefits: ["Works from day one, not week three", "Nothing to fuss over — set it and forget it", "Built and tested for real conditions, not a lab"],
      },
      social_proof_placeholder: "★★★★★ \"The first thing that actually worked.\" — add real testimonials here.",
      offer: `Launch week only: ${offer}.`,
      faq: [
        { q: "Is this just another quick fix?", a: "No — it addresses the cause, which is why it keeps working." },
        { q: "What if it doesn't work for me?", a: "30-day money-back guarantee, no questions." },
        { q: "How fast will I see a difference?", a: "Most people notice from the first use." },
      ],
      final_cta: { headline: "Stop patching the problem. Fix it.", cta_text: "Get started" },
    };
  }

  // email_sequence
  return {
    emails: [
      { send_timing: "Send immediately", subject_line: `Welcome to ${short}`, subject_line_variant_b: "You're in — here's step one", preview_text: "Two minutes to your first win.", body: "Hi {{First_Name}}, welcome. Here's the single most important first step, and what to expect this week.", cta: "Take step one" },
      { send_timing: "Send day 2", subject_line: "The one thing most people miss", subject_line_variant_b: `Getting the most from ${short}`, preview_text: "A 30-second tweak that changes everything.", body: "Hi {{First_Name}}, most people skip this — do it and results come faster. Here's how.", cta: "See how" },
      { send_timing: "Send day 5", subject_line: "Before your launch offer ends", subject_line_variant_b: "Quick question, {{First_Name}}", preview_text: `${offer} — last reminder.`, body: "Hi {{First_Name}}, your launch offer closes soon. If you've been on the fence, this is the moment.", cta: "Claim it now" },
    ],
  };
}
