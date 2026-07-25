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
        secondary: { type: "string" },
      },
      required: ["name", "age_range", "location", "pain_point", "alternative", "core_desire", "platforms", "secondary"],
      additionalProperties: false,
    },
    positioning: { type: "string" },
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
            required: ["angle", "primary_text", "headline", "description", "cta_button", "placement_notes"],
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
          preview: { type: "string" },
          goal: { type: "string" },
          body: { type: "string" },
          cta: { type: "string" },
        },
        required: ["subject", "preview", "goal", "body", "cta"],
        additionalProperties: false,
      },
    },
  },
  required: ["persona", "positioning", "platform_ads", "emails"],
  additionalProperties: false,
};

/* ------------------------------------------------------------------ */
/* Prompt                                                               */
/* ------------------------------------------------------------------ */

function buildBriefV3(b) {
  return `${briefCore(b)}

CAMPAIGN RULES
- positioning is a single crisp positioning statement contrasting against the competitor/status quo.
- Match the requested brand tone in every piece of copy, on every platform.

META ADS (platform_ads.meta — exactly 3 items)
- meta[0] angle "hook": pattern-interrupt that stops the scroll.
- meta[1] angle "story": trust/relatability micro-story from the persona's life.
- meta[2] angle "offer": conversion closer built on the launch offer.
- Char limits: primary_text ≤ 125 chars, headline ≤ 40 chars, description ≤ 30 chars.
- cta_button must be the single best fit from the allowed values.
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
- Limits: subject under 9 words, body under 26 words.`;
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

  return campaign;
}

module.exports = {
  V3_CAMPAIGN_SCHEMA,
  V3_SHAPE_INSTRUCTIONS,
  buildBriefV3,
  skeletonFromSchema,
  normalizeV3,
};
