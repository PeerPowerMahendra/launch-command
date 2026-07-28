/* Real Meta Marketing API integration.
   Everything is created in PAUSED state — nothing spends until the user
   reviews and activates it in Ads Manager. Configured entirely via .env
   (META_* variables); when unconfigured, the launch console falls back to
   the simulation. */

const GRAPH = "https://graph.facebook.com/v23.0";

const CTA_MAP = {
  "Shop Now": "SHOP_NOW",
  "Learn More": "LEARN_MORE",
  "Sign Up": "SIGN_UP",
  "Get Offer": "GET_OFFER",
  "Subscribe": "SUBSCRIBE",
  "Order Now": "ORDER_NOW",
};

function cfg() {
  return {
    token: process.env.META_ACCESS_TOKEN,
    accountId: process.env.META_AD_ACCOUNT_ID,
    pageId: process.env.META_PAGE_ID,
    landingUrl: process.env.META_LANDING_URL || "https://example.com",
  };
}

function metaConfigured() {
  const c = cfg();
  return !!(c.token && c.accountId && c.pageId);
}

async function graph(method, path, params = {}) {
  const c = cfg();
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  body.set("access_token", c.token);

  const res = method === "GET"
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body });

  const data = await res.json().catch(() => ({}));
  if (data.error) {
    const detail = data.error.error_user_msg || data.error.error_user_title || data.error.message;
    const e = new Error(`Meta API: ${detail}`);
    e.httpStatus = 502;
    e.meta = data.error;
    throw e;
  }
  return data;
}

/* Used by the "Connect" button — proves the token + account are real. */
async function verifyAccount() {
  const c = cfg();
  const acct = await graph("GET", c.accountId, {
    fields: "name,account_status,currency,timezone_name",
  });
  return {
    account_name: acct.name,
    account_id: acct.id,
    currency: acct.currency,
    timezone: acct.timezone_name,
    active: acct.account_status === 1,
  };
}

/* Creates: 1 paused campaign → 1 paused ad set → N paused creative+ad pairs.
   `ads` = the generated platform_ads.meta entries selected for launch.
   `budgetDaily` is in the ad account's major currency units. */
async function createMetaLaunch({ campaignName, ads, budgetDaily }) {
  const c = cfg();

  const campaign = await graph("POST", `${c.accountId}/campaigns`, {
    name: `${campaignName} — Launch Command`,
    objective: "OUTCOME_TRAFFIC",
    status: "PAUSED",
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false, // required by v23 when budgets live on the ad set
  });

  const adset = await graph("POST", `${c.accountId}/adsets`, {
    name: `${campaignName} — launch ad set`,
    campaign_id: campaign.id,
    daily_budget: Math.round(budgetDaily * 100), // minor units (paise/cents)
    billing_event: "IMPRESSIONS",
    optimization_goal: "LINK_CLICKS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    // Facebook-only until the Page has a linked Instagram account
    targeting: { geo_locations: { countries: ["IN"] }, publisher_platforms: ["facebook"] },
    status: "PAUSED",
  });

  const created = [];
  for (const ad of ads) {
    const creative = await graph("POST", `${c.accountId}/adcreatives`, {
      name: `${campaignName} — ${ad.angle} creative`,
      object_story_spec: {
        page_id: c.pageId,
        link_data: {
          link: c.landingUrl,
          message: ad.primary_text,
          name: ad.headline,
          description: ad.description,
          call_to_action: { type: CTA_MAP[ad.cta_button] || "LEARN_MORE" },
        },
      },
    });

    const createdAd = await graph("POST", `${c.accountId}/ads`, {
      name: `${campaignName} — ${ad.angle}-led`,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: "PAUSED",
    });

    created.push({ angle: ad.angle, creative_id: creative.id, ad_id: createdAd.id });
  }

  const accountNumeric = c.accountId.replace("act_", "");
  return {
    campaign_id: campaign.id,
    adset_id: adset.id,
    ads: created,
    ads_manager_url: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountNumeric}&selected_campaign_ids=${campaign.id}`,
  };
}

module.exports = { metaConfigured, verifyAccount, createMetaLaunch };
