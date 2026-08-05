/* v4 campaign contract — a fork of v3 that restructures Meta ads into
   AD SETS (Meta's Campaign → Ad Set → Ad hierarchy). Everything else
   (persona, positioning, KPIs, Google, TikTok, emails, distribution) is
   reused verbatim from v3 so v3 stays frozen and untouched.

   platform_ads.meta becomes:
     { ad_set_count, ad_sets: [ { name, audience, targeting, ads: [5] } ] }
   Ad sets are differentiated by AUDIENCE/targeting. Each ad set holds 5
   fully-written ads; at least one ad per set is hook-led. */

const { httpError } = require("./engine");
const { V3_CAMPAIGN_SCHEMA, buildBriefV3, skeletonFromSchema } = require("./v3-campaign");

const CTA_ENUM = ["Shop Now", "Learn More", "Sign Up", "Get Offer", "Subscribe", "Order Now"];
const MIN_ADSETS = 1;
const MAX_ADSETS = 5;
const ADS_PER_SET = 5;

/* ------------------------------------------------------------------ */
/* Schema — clone v3, replace platform_ads.meta with the ad-set shape   */
/* ------------------------------------------------------------------ */

const V4_CAMPAIGN_SCHEMA = JSON.parse(JSON.stringify(V3_CAMPAIGN_SCHEMA));
V4_CAMPAIGN_SCHEMA.properties.platform_ads.properties.meta = {
  type: "object",
  properties: {
    ad_set_count: { type: "number" },
    ad_sets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          audience: { type: "string" },
          targeting: { type: "string" },
          ads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                is_hook: { type: "boolean" },
                primary_text: { type: "string" },
                headline: { type: "string" },
                description: { type: "string" },
                cta_button: { type: "string", enum: CTA_ENUM },
              },
              required: ["is_hook", "primary_text", "headline", "description", "cta_button"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "audience", "targeting", "ads"],
        additionalProperties: false,
      },
    },
  },
  required: ["ad_sets"],
  additionalProperties: false,
};

function clampCount(n) {
  const v = Math.round(Number(n) || 3);
  return Math.max(MIN_ADSETS, Math.min(MAX_ADSETS, v));
}

/* ------------------------------------------------------------------ */
/* Prompt — reuse the whole v3 prompt, swap only the META ADS section   */
/* ------------------------------------------------------------------ */

function metaSectionV4(n) {
  const plural = n === 1 ? "ad set" : "ad sets";
  return `META ADS (platform_ads.meta — AD SET structure, ${n} ${plural})
- Produce EXACTLY ${n} ${plural}. Ad sets are differentiated by AUDIENCE / targeting — each targets a DISTINCT persona segment (e.g. cold interest audience, lookalike of buyers, retargeting/warm, broad, a specific sub-niche), NOT merely a different creative angle.
- Each ad set is an object: { name (e.g. "Ad Set 1 — Cold interest"), audience (one sentence naming exactly who this set targets), targeting (one line: the interest / behavior / lookalike / retargeting stack a media buyer would set), ads: [exactly ${ADS_PER_SET} ads] }.
- Each ad is an object: { is_hook (boolean true/false), primary_text (≤ 125 chars), headline (≤ 40 chars), description (≤ 30 chars), cta_button (the single best fit from: ${CTA_ENUM.join(", ")}) }.
- In EVERY ad set, at least ONE ad must be hook-led (is_hook = true): a scroll-stopping pattern-interrupt in the first line. The other ${ADS_PER_SET - 1} ads vary the approach (story, proof, benefit, offer) so the set is a genuine A/B test.
- Write copy specific to each ad set's AUDIENCE — a cold-interest ad set and a retargeting ad set must NOT read the same. Speak to where that segment is in their journey.`;
}

function buildBriefV4(b, adSetCount) {
  const n = clampCount(adSetCount);
  const v3 = buildBriefV3(b);
  const metaStart = v3.indexOf("META ADS (");
  const googleStart = v3.indexOf("GOOGLE RESPONSIVE SEARCH AD");
  if (metaStart === -1 || googleStart === -1) {
    // markers moved — fall back to appending the v4 meta rules
    return `${v3}\n\n${metaSectionV4(n)}`;
  }
  return v3.slice(0, metaStart) + metaSectionV4(n) + "\n\n" + v3.slice(googleStart);
}

/* ------------------------------------------------------------------ */
/* CLI shape instructions — generated from the schema for the count     */
/* ------------------------------------------------------------------ */

function shapeInstructionsV4(adSetCount) {
  const n = clampCount(adSetCount);
  const counts = {
    "platform_ads.meta.ad_sets": n,
    "platform_ads.meta.ad_sets[].ads": ADS_PER_SET,
    "platform_ads.google.headlines": 10,
    "platform_ads.google.descriptions": 4,
    "platform_ads.tiktok": 3,
    "platform_ads.tiktok[].script_beats": 4,
    "platform_ads.tiktok[].hashtags": 5,
    emails: 3,
    distribution: 7,
  };
  return `

OUTPUT FORMAT — CRITICAL
Respond with ONLY a single strict JSON object. No markdown fences, no commentary, no text before or after. It must match this exact shape (array lengths are exact; is_hook is true or false; fill every string):
${JSON.stringify(skeletonFromSchema(V4_CAMPAIGN_SCHEMA, counts), null, 2)}`;
}

/* ------------------------------------------------------------------ */
/* Normalization — lenient, mirrors v3 for shared parts                 */
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

function normalizeV4(campaign, adSetCount) {
  if (!campaign || typeof campaign !== "object") throw httpError(502, "The model returned an unreadable campaign. Please try again.");
  const { persona, positioning, platform_ads: pa, emails } = campaign;

  if (!persona || typeof persona !== "object" || !positioning) throw httpError(502, "The campaign is missing the persona or positioning. Please try again.");
  if (!Array.isArray(emails) || emails.length !== 3) throw httpError(502, "The campaign did not include exactly 3 emails. Please try again.");
  if (!pa || typeof pa !== "object") throw httpError(502, "The campaign is missing platform ads. Please try again.");

  /* Meta ad sets */
  let m = pa.meta;
  // defensive: if the model returned the old flat array, wrap it as one ad set
  if (Array.isArray(m)) m = { ad_sets: [{ name: "Ad Set 1", audience: "", targeting: "", ads: m }] };
  if (!m || !Array.isArray(m.ad_sets) || m.ad_sets.length < 1) {
    throw httpError(502, "The campaign did not include any Meta ad sets. Please try again.");
  }
  m.ad_sets = m.ad_sets.map((set, i) => {
    let ads = Array.isArray(set.ads) ? set.ads.slice(0, ADS_PER_SET) : [];
    if (ads.length === 0) throw httpError(502, `Ad set ${i + 1} has no ads. Please try again.`);
    // guarantee at least one hook-led ad per set
    if (!ads.some((a) => a && a.is_hook)) ads = ads.map((a, j) => (j === 0 ? { ...a, is_hook: true } : a));
    ads = ads.map((a) => ({
      is_hook: !!a.is_hook,
      primary_text: truncateAtWord(String(a.primary_text || ""), 125),
      headline: truncateAtWord(String(a.headline || ""), 40),
      description: truncateAtWord(String(a.description || ""), 30),
      cta_button: CTA_ENUM.includes(a.cta_button) ? a.cta_button : "Learn More",
    }));
    return {
      name: set.name || `Ad Set ${i + 1}`,
      audience: set.audience || "",
      targeting: set.targeting || "",
      ads,
    };
  });
  m.ad_set_count = m.ad_sets.length;
  pa.meta = m;

  /* TikTok — exactly 3 (same as v3) */
  if (!Array.isArray(pa.tiktok) || pa.tiktok.length < 3) throw httpError(502, "The campaign did not include 3 TikTok ad variants. Please try again.");
  pa.tiktok = pa.tiktok.slice(0, 3).map((ad) => ({
    ...ad,
    script_beats: Array.isArray(ad.script_beats) ? ad.script_beats.slice(0, 4) : [],
    hashtags: (Array.isArray(ad.hashtags) ? ad.hashtags.slice(0, 6) : []).map((h) => (h.startsWith("#") ? h : `#${h}`)),
  }));

  /* Google RSA — trim overages */
  const g = pa.google;
  if (!g || !Array.isArray(g.headlines) || g.headlines.length < 8 || !Array.isArray(g.descriptions) || g.descriptions.length < 3) {
    throw httpError(502, "The Google RSA came back incomplete (needs 10 headlines / 4 descriptions). Please try again.");
  }
  g.headlines = g.headlines.slice(0, 10).map((h) => truncateAtWord(h, 30));
  g.descriptions = g.descriptions.slice(0, 4).map((d) => truncateAtWord(d, 90));
  g.path1 = slugifyPath(g.path1);
  g.path2 = slugifyPath(g.path2);

  /* Strategy fields — lenient */
  campaign.strategic_insight = campaign.strategic_insight || "";
  campaign.kpi_note = campaign.kpi_note || "";
  const kpiKeys = ["reach", "ctr", "cac", "open_rate", "conv_rate", "roas"];
  campaign.kpis = campaign.kpis && typeof campaign.kpis === "object" ? campaign.kpis : {};
  for (const key of kpiKeys) {
    const k = campaign.kpis[key];
    campaign.kpis[key] = { target: (k && k.target) || "", window: (k && k.window) || "" };
  }
  campaign.distribution = Array.isArray(campaign.distribution) ? campaign.distribution.slice(0, 7) : [];

  return campaign;
}

module.exports = {
  V4_CAMPAIGN_SCHEMA,
  buildBriefV4,
  shapeInstructionsV4,
  normalizeV4,
  clampCount,
  MIN_ADSETS,
  MAX_ADSETS,
  ADS_PER_SET,
};
