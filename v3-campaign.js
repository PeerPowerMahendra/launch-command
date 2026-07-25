/* v3 campaign contract: schema, prompt builder, CLI shape skeleton, normalizer.
   Persona / positioning / emails are intentionally identical to v2 so the
   frontend data-field paths carry over. The generic ads array is superseded
   by platform_ads (Meta / Google RSA / TikTok). */

const { briefCore, httpError } = require("./engine");

/* ------------------------------------------------------------------ */
/* Schema                                                               */
/* ------------------------------------------------------------------ */
/* NOTE: keep to the structured-outputs keyword subset (type/properties/
   required/items/enum/additionalProperties). Counts and char limits are
   enforced by prompt rules + normalizeV3, never by schema keywords. */

const V3_CAMPAIGN_SCHEMA = {
  type: "object",
  properties: {
    persona: {
      type: "object",
      properties: {
        name: { type: "string" },
        age_range: { type: "string" },
        location: { type: "string" },
        pain_point: { type: "string" },
        alternative: { type: "string" },
        core_desire: { type: "string" },
        platforms: { type: "string" },
        primary_segment: { type: "string" },
        secondary: { type: "string" },
        psychographic_driver: { type: "string" },
        watering_holes: { type: "string" },
        trigger_moment: { type: "string" },
      },
      required: [
        "name", "age_range", "location", "pain_point", "alternative", "core_desire", "platforms",
        "primary_segment", "secondary", "psychographic_driver", "watering_holes", "trigger_moment",
      ],
      additionalProperties: false,
    },
    strategic_insight: { type: "string" },
    positioning: { type: "string" },
    kpis: {
      type: "object",
      properties: {
        reach:     { type: "object", properties: { target: { type: "string" }, window: { type: "string" } }, required: ["target", "window"], additionalProperties: false },
        ctr:       { type: "object", properties: { target: { type: "string" }, window: { type: "string" } }, required: ["target", "window"], additionalProperties: false },
        cac:       { type: "object", properties: { target: { type: "string" }, window: { type: "string" } }, required: ["target", "window"], additionalProperties: false },
        open_rate: { type: "object", properties: { target: { type: "string" }, window: { type: "string" } }, required: ["target", "window"], additionalProperties: false },
        conv_rate: { type: "object", properties: { target: { type: "string" }, window: { type: "string" } }, required: ["target", "window"], additionalProperties: false },
        roas:      { type: "object", properties: { target: { type: "string" }, window: { type: "string" } }, required: ["target", "window"], additionalProperties: false },
      },
      required: ["reach", "ctr", "cac", "open_rate", "conv_rate", "roas"],
      additionalProperties: false,
    },
    kpi_note: { type: "string" },
    platform_ads: {
      type: "object",
      properties: {
        meta: {
          type: "array",
          items: {
            type: "object",
            properties: {
              angle: { type: "string", enum: ["hook", "story", "offer"] },
              primary_text: { type: "string" },
              headline: { type: "string" },
              description: { type: "string" },
              cta_button: { type: "string", enum: ["Shop Now", "Learn More", "Sign Up", "Get Offer", "Subscribe", "Order Now"] },
              targeting: { type: "string" },
              placement_notes: {
                type: "object",
                properties: {
                  feed: { type: "string" },
                  reels: { type: "string" },
                  stories: { type: "string" },
                },
                required: ["feed", "reels", "stories"],
                additionalProperties: false,
              },
            },
            required: ["angle", "primary_text", "headline", "description", "cta_button", "targeting", "placement_notes"],
            additionalProperties: false,
          },
        },
        google: {
          type: "object",
          properties: {
            headlines: { type: "array", items: { type: "string" } },
            descriptions: { type: "array", items: { type: "string" } },
            path1: { type: "string" },
            path2: { type: "string" },
            cta: { type: "string" },
          },
          required: ["headlines", "descriptions", "path1", "path2", "cta"],
          additionalProperties: false,
        },
        tiktok: {
          type: "array",
          items: {
            type: "object",
            properties: {
              angle: { type: "string", enum: ["hook", "story", "offer"] },
              hook: { type: "string" },
              script_beats: { type: "array", items: { type: "string" } },
              caption: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } },
              sound_direction: { type: "string" },
              format: { type: "string", enum: ["talking-head UGC", "voiceover b-roll", "green-screen explainer", "POV skit"] },
              cta: { type: "string" },
            },
            required: ["angle", "hook", "script_beats", "caption", "hashtags", "sound_direction", "format", "cta"],
            additionalProperties: false,
          },
        },
      },
      required: ["meta", "google", "tiktok"],
      additionalProperties: false,
    },
    emails: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string" },
          subject_alt: { type: "string" },
          preview: { type: "string" },
          goal: { type: "string" },
          body: { type: "string" },
          cta: { type: "string" },
        },
        required: ["subject", "subject_alt", "preview", "goal", "body", "cta"],
        additionalProperties: false,
      },
    },
    distribution: {
      type: "array",
      items: {
        type: "object",
        properties: {
          asset: { type: "string" },
          channel: { type: "string" },
          format: { type: "string" },
          notes: { type: "string" },
          cadence: { type: "string" },
        },
        required: ["asset", "channel", "format", "notes", "cadence"],
        additionalProperties: false,
      },
    },
  },
  required: ["persona", "strategic_insight", "positioning", "kpis", "kpi_note", "platform_ads", "emails", "distribution"],
  additionalProperties: false,
};

/* ------------------------------------------------------------------ */
/* Prompt                                                               */
/* ------------------------------------------------------------------ */

function buildBriefV3(b) {
  return `${briefCore(b)}

AUDIENCE INTELLIGENCE (persona — this is the module that must impress a strategist)
- primary_segment: 2-3 sentences naming EXACTLY who — demographics plus life situation. Specific, never generic ("adults who like convenience" is a failure).
- secondary: the secondary segment worth a smaller bet, 1-2 sentences.
- psychographic_driver: what they believe, written as an inner-monologue quote in their own words — the sentence they'd say to a friend about this problem.
- watering_holes: named, specific places they gather — actual subreddits, Facebook/WhatsApp group types, TikTok/Instagram niches, newsletters, Discord servers, physical spots. Comma-separated list.
- trigger_moment: the specific, concrete moment when they realize they need this product.

STRATEGIC INSIGHT
- strategic_insight: the single non-obvious cultural or behavioral tension that powers the entire campaign — the creative engine every asset draws from. 2-3 sentences. It must be an insight (a surprising truth about the audience's relationship to this category), never a restated benefit.

POSITIONING FRAMEWORK
- positioning must follow this exact structure: "For [audience] who [pain], [product name] is the [category] that [key benefit]. Unlike [competitor/status quo], we [differentiator]. Proven by [proof point]."

KPI SUGGESTIONS (kpis + kpi_note)
- Suggest realistic launch-window targets grounded in the price point and category: reach (impressions), ctr (%), cac ($), open_rate (%), conv_rate (%), roas (×). Each target is a short value string ("50k", "1.8%", "$12", "3.1×"); each window is short ("first 14 days", "rolling 7 days", "per send").
- kpi_note: 2-3 sentences of unit-economics reasoning — price point → rough margin → CAC ceiling → the one metric that decides whether this launch works.

CAMPAIGN RULES
- Match the requested brand tone in every piece of copy, on every platform.

META ADS (platform_ads.meta — exactly 3 items)
- meta[0] angle "hook": pattern-interrupt that stops the scroll.
- meta[1] angle "story": trust/relatability micro-story from the persona's life.
- meta[2] angle "offer": conversion closer built on the launch offer.
- Char limits: primary_text ≤ 125 chars, headline ≤ 40 chars, description ≤ 30 chars.
- cta_button must be the single best fit from the allowed values.
- targeting: one line naming the audience stack for that angle — interests/communities for hook (cold), engagement retargeting for story (warm), cart/site retargeting + list for offer (hot).
- placement_notes: one tight sentence each on how the creative adapts to feed (1:1), reels (9:16 video), stories (9:16 tap-through).

GOOGLE RESPONSIVE SEARCH AD (platform_ads.google — ONE asset group)
- headlines: exactly 10, each ≤ 30 chars. Mix: 3 keyword-led (what they'd search), 3 benefit-led, 2 offer-led, 2 trust/proof-led. No two headlines may say the same thing.
- descriptions: exactly 4, each ≤ 90 chars, each usable alongside any headline.
- path1 and path2: ≤ 15 chars each, lowercase, no spaces (display URL folders, e.g. "sleep-mask" / "launch-offer").
- cta: the action phrase for the ad's final URL context.

TIKTOK ADS (platform_ads.tiktok — exactly 3 items)
- tiktok[0] "hook", tiktok[1] "story", tiktok[2] "offer" — same angle logic as Meta but written for sound-on vertical video.
- hook: ≤ 12 words, spoken/overlaid in the first 3 seconds, must create an open loop.
- script_beats: exactly 4 beats, each ≤ 15 words, covering problem → mechanism → proof/demo → CTA.
- caption: ≤ 100 chars. hashtags: 4-6 tags mixing niche and broad, each starting with #.
- sound_direction: one sentence (trending-sound style or voiceover mood).
- format: the single best fit from the allowed values.

EMAILS (emails — exactly 3 items)
- emails[0]: launch Announcement.
- emails[1]: Benefit Deep-Dive — explains the signature mechanism and handles one likely objection.
- emails[2]: Urgency/Scarcity — uses the deadline/launch offer.
- subject and subject_alt: two genuinely different A/B test approaches (e.g. curiosity vs direct benefit), never rewordings of each other.
- Limits: subjects under 9 words each, body under 26 words.

DISTRIBUTION LOG (distribution — exactly 7 items)
- Repurpose the launch assets natively across, in order: short vertical video (Reels/TikTok), carousel (IG feed/LinkedIn), thread (X/LinkedIn), story/status (IG Stories/WhatsApp), long-form recap (YouTube/blog), quote graphic (Pinterest), community post (relevant group/forum from watering_holes).
- asset: which source asset it repurposes (e.g. "Meta hook ad", "Email 2 mechanism section", "Positioning statement").
- notes: one sentence of adaptation advice that is native to the channel AND specific to THIS product and audience — never generic ("post consistently" is a failure).
- cadence: short scheduling note ("Day 1", "3x launch week", "final 48 hours").`;
}

/* ------------------------------------------------------------------ */
/* CLI shape instructions — generated from the schema so it can't drift */
/* ------------------------------------------------------------------ */

const ARRAY_COUNTS = {
  "platform_ads.meta": 3,
  "platform_ads.google.headlines": 10,
  "platform_ads.google.descriptions": 4,
  "platform_ads.tiktok": 3,
  "platform_ads.tiktok[].script_beats": 4,
  "platform_ads.tiktok[].hashtags": 5,
  "emails": 3,
  "distribution": 7,
};

function skeletonFromSchema(schema, counts = ARRAY_COUNTS, path = "") {
  if (schema.type === "object") {
    const obj = {};
    for (const [key, sub] of Object.entries(schema.properties)) {
      obj[key] = skeletonFromSchema(sub, counts, path ? `${path}.${key}` : key);
    }
    return obj;
  }
  if (schema.type === "array") {
    const n = counts[path] || 1;
    return Array.from({ length: n }, () => skeletonFromSchema(schema.items, counts, `${path}[]`));
  }
  return "";
}

const V3_SHAPE_INSTRUCTIONS = `

OUTPUT FORMAT — CRITICAL
Respond with ONLY a single strict JSON object. No markdown fences, no commentary, no text before or after. It must match this exact shape (array lengths are exact, fill every string):
${JSON.stringify(skeletonFromSchema(V3_CAMPAIGN_SCHEMA), null, 2)}`;

/* ------------------------------------------------------------------ */
/* Normalization / validation                                           */
/* ------------------------------------------------------------------ */

function truncateAtWord(s, max) {
  if (typeof s !== "string" || s.length <= max) return s;
  let cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.6) cut = cut.slice(0, lastSpace);
  return cut.replace(/[\s,;:.\-–—]+$/, "");
}

function slugifyPath(s, max = 15) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/* Validates structure; trims Google asset overages (real hard limits) at
   word boundaries instead of failing. Throws httpError(502) on structural
   problems the UI can't render around. */
function normalizeV3(campaign) {
  if (!campaign || typeof campaign !== "object") throw httpError(502, "The model returned an unreadable campaign. Please try again.");
  const { persona, positioning, platform_ads: pa, emails } = campaign;

  if (!persona || typeof persona !== "object" || !positioning) {
    throw httpError(502, "The campaign is missing the persona or positioning. Please try again.");
  }
  if (!Array.isArray(emails) || emails.length !== 3) {
    throw httpError(502, "The campaign did not include exactly 3 emails. Please try again.");
  }
  if (!pa || typeof pa !== "object") throw httpError(502, "The campaign is missing platform ads. Please try again.");

  // Meta — exactly 3 (tolerate extras, fail on fewer)
  if (!Array.isArray(pa.meta) || pa.meta.length < 3) throw httpError(502, "The campaign did not include 3 Meta ad variants. Please try again.");
  pa.meta = pa.meta.slice(0, 3);

  // TikTok — exactly 3
  if (!Array.isArray(pa.tiktok) || pa.tiktok.length < 3) throw httpError(502, "The campaign did not include 3 TikTok ad variants. Please try again.");
  pa.tiktok = pa.tiktok.slice(0, 3).map((ad) => ({
    ...ad,
    script_beats: Array.isArray(ad.script_beats) ? ad.script_beats.slice(0, 4) : [],
    hashtags: (Array.isArray(ad.hashtags) ? ad.hashtags.slice(0, 6) : []).map((h) => (h.startsWith("#") ? h : `#${h}`)),
  }));

  // Google RSA — hard char limits, trim rather than fail
  const g = pa.google;
  if (!g || !Array.isArray(g.headlines) || g.headlines.length < 8 || !Array.isArray(g.descriptions) || g.descriptions.length < 3) {
    throw httpError(502, "The Google RSA came back incomplete (needs 10 headlines / 4 descriptions). Please try again.");
  }
  g.headlines = g.headlines.slice(0, 10).map((h) => truncateAtWord(h, 30));
  g.descriptions = g.descriptions.slice(0, 4).map((d) => truncateAtWord(d, 90));
  g.path1 = slugifyPath(g.path1);
  g.path2 = slugifyPath(g.path2);

  // Strategy fields — lenient: fill gaps rather than fail (matters for the CLI path)
  campaign.strategic_insight = campaign.strategic_insight || "";
  campaign.kpi_note = campaign.kpi_note || "";
  const kpiKeys = ["reach", "ctr", "cac", "open_rate", "conv_rate", "roas"];
  campaign.kpis = campaign.kpis && typeof campaign.kpis === "object" ? campaign.kpis : {};
  for (const key of kpiKeys) {
    const k = campaign.kpis[key];
    campaign.kpis[key] = {
      target: (k && k.target) || "",
      window: (k && k.window) || "",
    };
  }
  campaign.distribution = Array.isArray(campaign.distribution) ? campaign.distribution.slice(0, 7) : [];

  return campaign;
}

module.exports = {
  V3_CAMPAIGN_SCHEMA,
  V3_SHAPE_INSTRUCTIONS,
  buildBriefV3,
  skeletonFromSchema,
  normalizeV3,
};
