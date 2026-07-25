/* Static sample campaign served when no AI is connected (demo mode).
   Same shape as CAMPAIGN_SCHEMA in server.js so the frontend renders it
   exactly like a real generation. The product name and offer from the
   brief are substituted in so the demo still feels connected to the form. */

function buildDemoCampaign(brief = {}) {
  const name = (brief.name || "").trim() || "Your Product";
  const offer = (brief.offer || "").trim() || "the launch offer";

  return {
    persona: {
      name: "Maya",
      age_range: "28–42",
      location: "Urban & suburban, mobile-first",
      pain_point:
        "I've tried the obvious fixes for this and none of them actually stick — I'm tired of wasting money on things that half-work.",
      alternative: "Cheap quick fixes and whatever the market leader sells",
      core_desire: "A solution that finally works without constant effort or second-guessing",
      platforms: "Instagram and YouTube daily, checks email every morning",
      secondary: "Gift buyers looking for a proven, safe choice for someone who has this problem.",
    },
    positioning:
      `${name} is for people who are done settling for the status quo — it fixes the real problem instead of masking it.`,
    ads: [
      {
        primary_text:
          `Still putting up with the same old problem? ${name} was built for the moment you decide you're done tolerating it.`,
        headline: "Stop tolerating it. Fix it.",
        description: "The fix that actually holds up in real life.",
        visual: "Split-screen: the frustrating status quo on the left, the calm after-state with the product on the right.",
        cta: "Learn More",
        rationale: "A pattern-interrupt that names the frustration stops the scroll for people living with it.",
      },
      {
        primary_text:
          `"I'd tried everything before ${name}. Two weeks in, I stopped thinking about the problem completely." Real relief, no gimmicks.`,
        headline: "It finally just… worked",
        description: "Hear it from someone who was skeptical too.",
        visual: "UGC-style testimonial clip, natural lighting, customer speaking straight to camera.",
        cta: "See Their Story",
        rationale: "A relatable first-person story builds the trust a skeptical buyer needs before clicking.",
      },
      {
        primary_text:
          `Launch week only: ${offer}. If you've been waiting for the right moment to fix this, it's now.`,
        headline: "Launch offer ends soon",
        description: "Claim the launch deal before it's gone.",
        visual: "Product hero shot with a bold countdown badge and the offer in large type.",
        cta: "Get the Offer",
        rationale: "A clear deadline plus the launch discount converts warm audiences who already saw ads A and B.",
      },
    ],
    emails: [
      {
        subject: `Meet ${name} — it's finally here`,
        preview: "The wait is over. Here's what it does and why it's different.",
        goal: "Announce the launch and drive first-day visits to the product page.",
        body: "It's live. Built to solve the problem properly, not patch it. See what makes it different and grab the launch offer.",
        cta: "See the Launch",
      },
      {
        subject: "Why this works when others don't",
        preview: "The mechanism behind it — and the question everyone asks.",
        goal: "Explain the signature mechanism and pre-empt the biggest objection.",
        body: "Most fixes treat the symptom. Here's the mechanism that goes after the cause — and the honest answer to the most common doubt.",
        cta: "Read How It Works",
      },
      {
        subject: "Last call — the launch offer ends tonight",
        preview: "This is the final reminder before pricing goes back up.",
        goal: "Convert fence-sitters with the deadline before the launch window closes.",
        body: `Tonight ${offer} disappears. If you've been thinking about it, this is the moment — after midnight it's gone.`,
        cta: "Claim the Offer",
      },
    ],
  };
}

/* v3 variant: same persona/positioning/emails, plus platform_ads
   (Meta / Google RSA / TikTok) matching V3_CAMPAIGN_SCHEMA — all
   char limits respected so normalizeV3 passes it untouched. */
function buildDemoCampaignV3(brief = {}) {
  const base = buildDemoCampaign(brief);
  const name = (brief.name || "").trim() || "Your Product";
  const shortName = name.length > 22 ? name.slice(0, 22) : name;
  const offer = (brief.offer || "").trim() || "the launch offer";

  return {
    persona: {
      ...base.persona,
      primary_segment:
        "Adults 28–45 in urban and suburban metros who have already tried the cheap fixes for this problem and been burned. They research before buying, read reviews, and will pay more once for something that actually holds.",
      psychographic_driver:
        "\"I've wasted enough money on things that half-work. I'd rather pay once for the real fix than keep buying band-aids.\"",
      watering_holes:
        "Niche subreddits for the problem space, Facebook buy-it-for-life groups, Instagram review accounts, product-comparison YouTube channels, neighborhood WhatsApp groups",
      trigger_moment:
        "The moment the latest cheap fix fails again — usually late at night — and they open their phone to search \"best [category] that actually works\".",
    },
    strategic_insight:
      "This audience doesn't distrust the product category — they distrust the promises around it. Every failed cheap fix has trained them to hear marketing as noise, so the campaign wins by sounding like the honest friend who already tried everything, not the brand that shouts loudest.",
    positioning: base.positioning,
    kpis: {
      reach:     { target: "40k",  window: "first 14 days" },
      ctr:       { target: "1.4%", window: "rolling 7 days" },
      cac:       { target: "$18",  window: "launch month" },
      open_rate: { target: "38%",  window: "per send" },
      conv_rate: { target: "2.8%", window: "rolling 7 days" },
      roas:      { target: "2.5×", window: "first 14 days" },
    },
    kpi_note:
      "At this price point, one sale must cover acquisition on the first order — so CAC is the ceiling that decides everything. Hold CAC under a third of order value and the launch funds itself; the metric that matters most after week one is repeat/referral rate, because this audience talks.",
    platform_ads: {
      meta: [
        {
          angle: "hook",
          primary_text: `You've learned to live with it. You don't have to. Meet ${shortName}.`,
          headline: "Stop tolerating. Start fixing.",
          description: "The fix that holds.",
          cta_button: "Learn More",
          targeting: "Cold: category interests + problem-adjacent communities + 1% lookalike of email list.",
          placement_notes: {
            feed: "Split-screen before/after in 1:1, problem on the left, calm after-state right.",
            reels: "Open on the frustration in the first second, hard cut to the product in use.",
            stories: "Full-bleed after-state with a single line of overlay text and a swipe-up.",
          },
        },
        {
          angle: "story",
          primary_text: `"I was the biggest skeptic. Two weeks in, I stopped thinking about the problem." — an early ${shortName} customer.`,
          headline: "It finally just worked",
          description: "From a skeptic like you.",
          cta_button: "Learn More",
          targeting: "Warm: video viewers 50%+, IG engagers, site visitors 30 days.",
          placement_notes: {
            feed: "UGC-style testimonial frame with the quote as large type over natural photo.",
            reels: "Customer speaks straight to camera, captions on, no music bed.",
            stories: "Quote card first frame, product demo second frame, tap-through CTA.",
          },
        },
        {
          angle: "offer",
          primary_text: `Launch week only: ${offer}. The right moment to fix this is the one with the discount.`,
          headline: "The launch offer ends soon",
          description: "Claim it before it's gone.",
          cta_button: "Get Offer",
          targeting: "Hot: cart abandoners + email list + engagers who haven't purchased.",
          placement_notes: {
            feed: "Product hero shot with bold offer badge and end-date in the corner.",
            reels: "Countdown-style cut every second, offer terms as animated overlay text.",
            stories: "Countdown sticker on the offer card, single tap-through to checkout.",
          },
        },
      ],
      google: {
        headlines: [
          "Stop Fighting the Problem",
          "The Fix That Finally Holds",
          "Built for Real Life",
          "Works From Night One",
          "No More Half-Measures",
          "Designed to Disappear",
          "Launch Week: Save Big",
          "Free Extra With Launch",
          "Loved by Early Users",
          "30-Day Guarantee",
        ],
        descriptions: [
          "The mechanism goes after the cause, not the symptom. Feel the difference from day one.",
          "Tried everything? This was built for exactly that moment. Simple, proven, no gimmicks.",
          "Launch pricing won't last. Claim the offer before the window closes this week.",
          "Real customers, real results. See why early users say it finally just works.",
        ],
        path1: "launch-offer",
        path2: "get-started",
        cta: "Claim the launch offer",
      },
      tiktok: [
        {
          angle: "hook",
          hook: "POV: you finally found the thing that actually fixes it",
          script_beats: [
            "Open on the daily frustration everyone with this problem knows",
            "Cut to the mechanism and show exactly why it works",
            "Quick unscripted demo with a real first reaction",
            "End card with the launch offer and where to get it",
          ],
          caption: "The fix I didn't believe until I tried it.",
          hashtags: ["#TikTokMadeMeBuyIt", "#launchweek", "#problemsolved", "#newlaunch", "#fyp"],
          sound_direction: "Trending lo-fi bed with a hard cut on the reveal beat.",
          format: "talking-head UGC",
          cta: "Tap the link before launch week ends",
        },
        {
          angle: "story",
          hook: "I tried everything before this — here's what finally worked",
          script_beats: [
            "List the failed fixes fast, one jump cut each",
            "The moment of finding it and deciding to try once more",
            "Show the mechanism doing what the others could not",
            "Honest verdict to camera and a soft call to action",
          ],
          caption: "Not sponsored by my own skepticism anymore.",
          hashtags: ["#honestreview", "#beforeandafter", "#worthit", "#newfind"],
          sound_direction: "Calm voiceover over ambient b-roll, no trending audio.",
          format: "voiceover b-roll",
          cta: "Link in bio for the launch deal",
        },
        {
          angle: "offer",
          hook: "If you've been waiting for a sign, this is it",
          script_beats: [
            "Green-screen over the offer page pointing at the deal",
            "Break down exactly what the launch bundle includes",
            "Show the deadline and what happens when it passes",
            "Direct ask: grab it now while the window is open",
          ],
          caption: "Launch week pricing disappears soon — do not scroll past this twice.",
          hashtags: ["#launchdeal", "#limitedtime", "#dealalert", "#shopsmart", "#launchweek"],
          sound_direction: "Upbeat trending sound, cut to silence on the deadline reveal.",
          format: "green-screen explainer",
          cta: "Get the launch offer now",
        },
      ],
    },
    emails: base.emails.map((e, i) => ({
      ...e,
      subject_alt: [
        "The wait is over — see what's new",
        "One question everyone asks us",
        "This disappears at midnight",
      ][i],
    })),
    distribution: [
      { asset: "Meta hook ad", channel: "Reels / TikTok", format: "Short vertical video", notes: "Open on the frustration in the first second, product reveal at second three — no logo until the end card.", cadence: "3x launch week" },
      { asset: "Meta story ad", channel: "IG feed / LinkedIn", format: "Carousel", notes: "Split the customer story into 5 frames; the skeptic-to-believer turn lands on frame 4, CTA on 5.", cadence: "Day 2" },
      { asset: "Email 2 mechanism section", channel: "X / LinkedIn", format: "Thread", notes: "Six posts: pain, failed fixes, the mechanism, proof, honest caveat, offer — one idea per post.", cadence: "Day 3" },
      { asset: "Offer ad", channel: "IG Stories / WhatsApp Status", format: "Story / status", notes: "Countdown sticker over the offer card; single tap-through — no extra frames.", cadence: "Final 48 hours" },
      { asset: "Email 2 deep-dive", channel: "YouTube / blog", format: "Long-form recap", notes: "Expand the mechanism into an honest explainer; answer the top objection in the first minute.", cadence: "Launch week" },
      { asset: "Positioning statement", channel: "Pinterest", format: "Quote graphic", notes: "Set the one-line positioning in brand type on a clean background — link to the story page, not checkout.", cadence: "Day 4" },
      { asset: "Persona pain point", channel: "Community post", format: "Discussion thread", notes: "Post the pain point as a genuine question in a relevant group; mention the product only in replies.", cadence: "Day 1" },
    ],
  };
}

module.exports = { buildDemoCampaign, buildDemoCampaignV3 };
