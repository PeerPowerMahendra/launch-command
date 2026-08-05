/* /api/v4/* — v4 generation, campaign persistence, and launch simulation.
   A self-contained fork of routes-v3 so v3 stays frozen. The only real
   difference is Meta: campaigns carry platform_ads.meta = { ad_sets: [...] }
   (Meta's ad-set hierarchy). The launch composer flattens ad sets → ads. */

const express = require("express");
const fs = require("fs");
const path = require("path");

const { runEngine, generationMode, SYSTEM_PROMPT, streamJson } = require("./engine");
const { V4_CAMPAIGN_SCHEMA, buildBriefV4, shapeInstructionsV4, normalizeV4, clampCount } = require("./v4-campaign");
const { buildDemoCampaignV4 } = require("./demo-campaign");
const { metaConfigured, verifyAccount, createMetaLaunch } = require("./meta-ads");

/* ---------------- deterministic PRNG ---------------- */
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAGES = [
  { key: "validating", label: "Validating copy", until: 0.12 },
  { key: "uploading", label: "Uploading creative", until: 0.34 },
  { key: "review", label: "Policy review", until: 0.62 },
  { key: "learning", label: "Learning phase", until: 1.0 },
];
const PLATFORM_BASELINES = {
  meta:   { ctr: [0.009, 0.024], cpm: [8, 22],   model: "cpm" },
  google: { ctr: [0.03, 0.07],   cpc: [0.8, 2.6], model: "cpc" },
  tiktok: { ctr: [0.006, 0.018], cpm: [5, 14],   model: "cpm" },
};
const ANGLE_MULT = { hook: { ctr: 1.15, cvr: 1.0 }, story: { ctr: 1.10, cvr: 1.05 }, offer: { ctr: 1.0, cvr: 1.25 } };
const CONNECT_DETAILS = {
  meta:   { account_name: "Launch Command Media", account_id: "act_84921004" },
  google: { account_name: "launch-command-ads",   account_id: "739-522-8841" },
  tiktok: { account_name: "@launchcommand",       account_id: "7148291" },
};
const ACCOUNTS_SEED = { meta: { connected: false }, google: { connected: false }, tiktok: { connected: false } };

/* Flatten Meta ad sets → a flat list of launchable ads (stable order). */
function flatMetaAds(campaign) {
  const sets = ((campaign && campaign.platform_ads && campaign.platform_ads.meta) || {}).ad_sets || [];
  const out = [];
  sets.forEach((set, si) =>
    (set.ads || []).forEach((ad, ai) =>
      out.push({ ...ad, angle: ad.is_hook ? "hook" : "story", set_name: set.name, set_index: si, ad_in_set: ai })
    )
  );
  return out;
}

module.exports = function createV4Router({ DATA_DIR }) {
  const router = express.Router();
  const CAMPAIGN_FILE = path.join(DATA_DIR, "v4-campaign.json");
  const ACCOUNTS_FILE = path.join(DATA_DIR, "v4-accounts.json");
  const LAUNCHES_FILE = path.join(DATA_DIR, "v4-launches.json");

  const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
  const writeJson = (file, data) => { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); };

  /* ---------------- generation + campaign ---------------- */

  router.post("/generate", async (req, res) => {
    const b = req.body || {};
    const required = ["name", "category", "price", "problem", "mechanism", "competitor", "offer", "tone"];
    const missing = required.filter((k) => !b[k] || !String(b[k]).trim());
    if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });

    const adSetCount = clampCount(b.ad_sets ?? b.ad_set_count ?? 3);

    const prior = readJson(CAMPAIGN_FILE, {});
    const priorKpis = prior.campaign && prior.campaign.kpis;
    const mergeKpis = (generated) => {
      if (!priorKpis) return generated || undefined;
      const out = {};
      const keys = new Set([...Object.keys(priorKpis), ...Object.keys(generated || {})]);
      for (const key of keys) {
        const user = priorKpis[key] || {};
        const gen = (generated || {})[key] || {};
        out[key] = {
          target: (user.target && String(user.target).trim()) ? user.target : gen.target || "",
          window: (user.window && String(user.window).trim()) ? user.window : gen.window || "",
        };
      }
      return out;
    };

    if (generationMode() === "demo") {
      const campaign = buildDemoCampaignV4(b, adSetCount);
      campaign.kpis = mergeKpis(campaign.kpis);
      writeJson(CAMPAIGN_FILE, { brief: b, campaign, generated_at: new Date().toISOString(), demo: true });
      return res.json({ ...campaign, demo: true });
    }

    streamJson(res, (async () => {
      const raw = await runEngine({
        system: SYSTEM_PROMPT,
        prompt: buildBriefV4(b, adSetCount),
        schema: V4_CAMPAIGN_SCHEMA,
        shapeInstructions: shapeInstructionsV4(adSetCount),
        maxTokens: 32000,
        timeoutMs: 600000,
      });
      const campaign = normalizeV4(raw, adSetCount);
      campaign.kpis = mergeKpis(campaign.kpis);
      writeJson(CAMPAIGN_FILE, { brief: b, campaign, generated_at: new Date().toISOString() });
      return campaign;
    })());
  });

  router.get("/campaign", (req, res) => res.json(readJson(CAMPAIGN_FILE, { brief: null, campaign: null, generated_at: null })));

  router.put("/campaign", (req, res) => {
    const { campaign } = req.body || {};
    if (!campaign || typeof campaign !== "object" || !campaign.persona || !campaign.platform_ads || !campaign.emails) {
      return res.status(400).json({ error: "Body must be { campaign } with persona, platform_ads, and emails." });
    }
    const existing = readJson(CAMPAIGN_FILE, {});
    writeJson(CAMPAIGN_FILE, { brief: existing.brief || null, campaign, generated_at: existing.generated_at || null, edited_at: new Date().toISOString() });
    res.json({ ok: true });
  });

  /* ---------------- accounts ---------------- */

  router.get("/accounts", (req, res) => {
    const accounts = readJson(ACCOUNTS_FILE, ACCOUNTS_SEED);
    accounts.meta = { ...accounts.meta, live_api: metaConfigured() };
    res.json({ accounts });
  });

  router.put("/accounts/:platform", async (req, res) => {
    const platform = req.params.platform;
    if (!CONNECT_DETAILS[platform]) return res.status(404).json({ error: `Unknown platform: ${platform}` });
    const accounts = readJson(ACCOUNTS_FILE, ACCOUNTS_SEED);
    const connected = !!(req.body || {}).connected;
    if (platform === "meta" && connected && metaConfigured()) {
      try {
        const info = await verifyAccount();
        accounts.meta = { connected: true, real: true, ...info, connected_at: new Date().toISOString() };
        writeJson(ACCOUNTS_FILE, accounts);
        return res.json({ accounts: { ...accounts, meta: { ...accounts.meta, live_api: true } } });
      } catch (err) { return res.status(err.httpStatus || 502).json({ error: err.message }); }
    }
    accounts[platform] = connected ? { connected: true, ...CONNECT_DETAILS[platform], connected_at: new Date().toISOString() } : { connected: false };
    writeJson(ACCOUNTS_FILE, accounts);
    res.json({ accounts });
  });

  /* ---------------- launch simulation ---------------- */

  function itemState(record, item, now) {
    if (item.real) return { status: "paused", current_step: "Created — paused in Ads Manager", step_index: STAGES.length, progress: 1, ads_manager_url: item.meta && item.meta.ads_manager_url };
    const startedAt = new Date(record.created_at).getTime() + item.start_offset_ms;
    const elapsed = now - startedAt;
    if (elapsed < 0) return { status: "queued", current_step: "Queued", step_index: -1, progress: 0 };
    const frac = elapsed / item.duration_ms;
    if (frac >= 1) return { status: "live", current_step: "Live", step_index: STAGES.length, progress: 1, live_at: new Date(startedAt + item.duration_ms).toISOString() };
    const idx = STAGES.findIndex((s) => frac < s.until);
    return { status: "launching", current_step: STAGES[idx].label + "…", step_index: idx, progress: Math.min(frac, 0.999) };
  }

  function itemMetrics(record, item, state, now) {
    if (state.status !== "live") return null;
    const rand = mulberry32(hashString(record.id + item.id));
    const base = PLATFORM_BASELINES[item.platform];
    const mult = ANGLE_MULT[item.angle] || { ctr: 1, cvr: 1 };
    const pick = ([lo, hi]) => lo + rand() * (hi - lo);
    const ctr = pick(base.ctr) * mult.ctr;
    const unitCost = base.model === "cpm" ? pick(base.cpm) : pick(base.cpc);
    const cvr = (0.015 + rand() * 0.03) * mult.cvr;
    const plateau = 40000 + rand() * 100000;
    const aov = parseFloat(String(record.aov)) || 79;
    const hoursLive = (now - new Date(state.live_at).getTime()) / 3600000;
    const growth = (h) => 1 - Math.exp(-(h + 0.05) / 3);
    const impressions = Math.round(plateau * growth(hoursLive));
    const clicks = Math.round(impressions * ctr);
    const spend = base.model === "cpm" ? (impressions / 1000) * unitCost : clicks * unitCost;
    const conversions = Math.round(clicks * cvr);
    const revenue = conversions * aov;
    const roas = spend > 0 ? revenue / spend : 0;
    const series = { impressions: [], spend: [], roas: [] };
    let prev = 0;
    for (let i = 1; i <= 7; i++) {
      const at = plateau * growth((hoursLive * i) / 7);
      const bucketImpr = Math.max(0, Math.round((at - prev) * (0.85 + rand() * 0.3)));
      prev = at;
      const bucketSpend = base.model === "cpm" ? (bucketImpr / 1000) * unitCost : bucketImpr * ctr * unitCost;
      series.impressions.push(bucketImpr);
      series.spend.push(Number(bucketSpend.toFixed(2)));
      series.roas.push(Number((roas * (0.8 + rand() * 0.4)).toFixed(2)));
    }
    return {
      impressions, clicks,
      ctr: Number((ctr * 100).toFixed(2)),
      cpm: base.model === "cpm" ? Number(unitCost.toFixed(2)) : null,
      cpc: base.model === "cpc" ? Number(unitCost.toFixed(2)) : Number(clicks > 0 ? (spend / clicks).toFixed(2) : 0),
      spend: Number(spend.toFixed(2)), conversions,
      revenue: Number(revenue.toFixed(2)), roas: Number(roas.toFixed(2)), series,
    };
  }

  function withComputedState(record, now = Date.now()) {
    const items = record.items.map((item) => { const state = itemState(record, item, now); return { ...item, ...state, metrics: itemMetrics(record, item, state, now) }; });
    const statuses = items.map((i) => i.status);
    const terminal = statuses.every((s) => s === "live" || s === "paused");
    const status = terminal ? (statuses.includes("paused") ? "paused" : "live") : statuses.some((s) => s === "launching") ? "launching" : "queued";
    return { ...record, items, status };
  }

  router.post("/launch", async (req, res) => {
    const { items, budget_daily } = req.body || {};
    const saved = readJson(CAMPAIGN_FILE, { campaign: null });
    if (!saved.campaign) return res.status(409).json({ error: "No campaign yet — generate one in the workspace first." });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Body must include a non-empty items array." });

    const accounts = readJson(ACCOUNTS_FILE, ACCOUNTS_SEED);
    for (const it of items) {
      if (!PLATFORM_BASELINES[it.platform]) return res.status(400).json({ error: `Unknown platform: ${it.platform}` });
      if (!accounts[it.platform] || !accounts[it.platform].connected) return res.status(409).json({ error: `${it.platform} is not connected — connect the account first.`, platform: it.platform });
    }

    const pa = saved.campaign.platform_ads;
    const metaFlat = flatMetaAds(saved.campaign);
    const resolve = (it) => (it.platform === "meta" ? metaFlat[it.ad_index] : it.platform === "google" ? null : (pa[it.platform] || [])[it.ad_index]);

    const metaIsReal = accounts.meta && accounts.meta.real;
    const metaItems = items.filter((it) => it.platform === "meta");
    let metaResult = null;
    if (metaIsReal && metaItems.length) {
      const selectedAds = metaItems.map((it) => metaFlat[it.ad_index]).filter(Boolean);
      try {
        metaResult = await createMetaLaunch({ campaignName: (saved.brief && saved.brief.name) || "Launch Command", ads: selectedAds, budgetDaily: Number(budget_daily) || 50 });
      } catch (err) { return res.status(err.httpStatus || 502).json({ error: err.message }); }
    }

    const id = "L-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
    const seedRand = mulberry32(hashString(id));

    const record = {
      id,
      created_at: new Date().toISOString(),
      campaign_name: (saved.brief && saved.brief.name) || "Untitled campaign",
      budget_daily: Number(budget_daily) || 50,
      aov: (saved.brief && String(saved.brief.price).replace(/[^0-9.]/g, "")) || "79",
      items: items.map((it, idx) => {
        const source = resolve(it);
        const isRealMeta = it.platform === "meta" && metaResult;
        const createdAd = isRealMeta && source && metaResult.ads[metaItems.findIndex((mi) => mi.ad_index === it.ad_index)];
        return {
          id: "i" + idx,
          platform: it.platform,
          ad_index: it.ad_index ?? 0,
          name: it.name || `${it.platform} ad`,
          angle: source ? source.angle || (source.is_hook ? "hook" : "story") : null,
          start_offset_ms: idx * 1500,
          duration_ms: Math.round(12000 + seedRand() * 6000),
          ...(isRealMeta ? { real: true, meta: { campaign_id: metaResult.campaign_id, adset_id: metaResult.adset_id, ad_id: createdAd ? createdAd.ad_id : null, ads_manager_url: metaResult.ads_manager_url } } : {}),
        };
      }),
    };

    const launches = readJson(LAUNCHES_FILE, []);
    launches.unshift(record);
    writeJson(LAUNCHES_FILE, launches);
    res.json(withComputedState(record));
  });

  router.get("/launches", (req, res) => res.json({ launches: readJson(LAUNCHES_FILE, []).map((r) => withComputedState(r)) }));
  router.get("/launches/:id", (req, res) => {
    const record = readJson(LAUNCHES_FILE, []).find((r) => r.id === req.params.id);
    if (!record) return res.status(404).json({ error: "Launch not found" });
    res.json(withComputedState(record));
  });
  router.post("/reset", (req, res) => { writeJson(ACCOUNTS_FILE, ACCOUNTS_SEED); writeJson(LAUNCHES_FILE, []); res.json({ ok: true }); });

  return router;
};
