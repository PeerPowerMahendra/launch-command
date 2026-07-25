/* ================================================================
   LAUNCH COMMAND v3 — workspace logic
   Brief → /api/v3/generate → platform-tabbed ad review surface.
   Everything editable persists via debounced PUT /api/v3/campaign.
   Depends on window.V3 (v3-shared.js). No frameworks.
   ================================================================ */
"use strict";
(function () {
  const { $, $$, toast, fetchJSON, getByPath, setByPath, copyText, debounce, REDUCED_MOTION } = window.V3;

  /* ---------------- state ---------------- */

  const state = {
    campaign: null,
    brief: null,
    engineMode: null, // "api" | "claude-code" | "demo" | null
    hasCampaign: false,
    pendingKpis: null, // KPI edits made before any campaign exists
  };

  const AI_SECTIONS = ["m01", "m02", "m03"];
  const SCROLL_BEHAVIOR = REDUCED_MOTION ? "auto" : "smooth";

  const LIMITS = {
    metaPrimary: 125,
    metaHeadline: 40,
    metaDesc: 30,
    gHead: 30,
    gDesc: 90,
    gPath: 15,
  };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------- error banner + demo notice ---------------- */

  function showError(msg) {
    $("#error-text").textContent = msg;
    $("#error-banner").hidden = false;
  }

  function hideError() {
    $("#error-banner").hidden = true;
  }

  function showDemoNotice() { $("#demo-notice").hidden = false; }
  function hideDemoNotice() { $("#demo-notice").hidden = true; }

  $("#error-dismiss").addEventListener("click", hideError);
  $("#demo-dismiss").addEventListener("click", hideDemoNotice);

  /* ---------------- markup helpers ---------------- */

  /* editable span bound to a campaign path */
  function edit(path, value, opts = {}) {
    const { cls = "", ph = "Awaiting generation", limit = null, oneLine = false } = opts;
    return (
      `<span class="ai-field${cls ? " " + cls : ""}${oneLine ? " one-line" : ""}"` +
      ` contenteditable="true" spellcheck="false" data-field="${esc(path)}"` +
      ` data-placeholder="${esc(ph)}"${limit ? ` data-limit="${limit}"` : ""}>${esc(value)}</span>`
    );
  }

  function counter(path, value, limit) {
    const len = String(value == null ? "" : value).length;
    return `<span class="char-count${len > limit ? " over" : ""}" data-count-for="${esc(path)}">${len}/${limit}</span>`;
  }

  const NOTE_GLYPH =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 12.5V3.8l7-1.4V11"></path><circle cx="4.2" cy="12.5" r="1.8"></circle><circle cx="11.2" cy="11" r="1.8"></circle></svg>';

  const SHUFFLE_GLYPH =
    '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 4.5h2.8l7.4 7h3.3"></path><path d="M1 11.5h2.8l2.3-2.2"></path><path d="M9.4 6.3l1.8-1.8h3.3"></path>' +
    '<path d="M12.7 2.5l2 2-2 2"></path><path d="M12.7 9.5l2 2-2 2"></path></svg>';

  /* ---------------- 02 · meta cards ---------------- */

  function metaCardEl(ad, i) {
    const brand = ((state.brief && state.brief.name) || "Your Brand").trim() || "Your Brand";
    const p = `platform_ads.meta.${i}`;
    const angle = String(ad.angle || "hook").toLowerCase();
    const chipKind = angle === "story" ? "accent" : angle === "offer" ? "ok" : "warn";
    const notes = ad.placement_notes || {};
    return (
      `<article class="k-card ad-card meta-card reveal-item">` +
      `<div class="card-head">` +
      `<span class="k-chip ${chipKind}">${esc(angle)}</span>` +
      `<span class="k-label">Variant 0${i + 1}</span>` +
      `<button class="copy-btn" type="button" data-copy="meta:${i}" aria-label="Copy Meta variant ${i + 1}">Copy</button>` +
      `</div>` +
      `<div class="meta-preview">` +
      `<div class="mp-head">` +
      `<span class="mp-avatar" aria-hidden="true">${esc(brand.charAt(0).toUpperCase())}</span>` +
      `<span class="mp-id"><span class="mp-brand">${esc(brand)}</span><span class="mp-sponsored">Sponsored</span></span>` +
      `</div>` +
      `<div class="mp-primary">` +
      edit(`${p}.primary_text`, ad.primary_text, { ph: "Primary text", limit: LIMITS.metaPrimary }) +
      counter(`${p}.primary_text`, ad.primary_text, LIMITS.metaPrimary) +
      `</div>` +
      `<div class="mp-media"><span class="k-label">Creative</span></div>` +
      `<div class="mp-foot">` +
      `<span class="mp-copy">` +
      `<span class="mp-headline">${edit(`${p}.headline`, ad.headline, { ph: "Headline", limit: LIMITS.metaHeadline, oneLine: true })}</span>` +
      `<span class="mp-desc">${edit(`${p}.description`, ad.description, { ph: "Description", limit: LIMITS.metaDesc, oneLine: true })}</span>` +
      `<span class="mp-counts">${counter(`${p}.headline`, ad.headline, LIMITS.metaHeadline)}${counter(`${p}.description`, ad.description, LIMITS.metaDesc)}</span>` +
      `</span>` +
      `<span class="mp-cta">${edit(`${p}.cta_button`, ad.cta_button, { ph: "CTA", oneLine: true })}</span>` +
      `</div>` +
      `</div>` +
      `<div class="placement-notes">` +
      ["feed", "reels", "stories"]
        .map((k) => `<div class="pn-row"><span class="k-label">${k}</span>${edit(`${p}.placement_notes.${k}`, notes[k], { ph: "Placement note" })}</div>`)
        .join("") +
      `</div>` +
      `</article>`
    );
  }

  /* ---------------- 02 · google RSA ---------------- */

  function googleRsaEl(rsa) {
    const p = "platform_ads.google";
    const heads = rsa.headlines || [];
    const descs = rsa.descriptions || [];
    return (
      `<div class="google-wrap reveal-item">` +
      `<div class="k-card serp-card">` +
      `<div class="card-head">` +
      `<span class="k-chip google">Search preview</span>` +
      `<span class="k-label">Responsive search ad</span>` +
      `<span class="head-actions">` +
      `<button class="k-btn-ghost mini-btn" type="button" id="rsa-shuffle">${SHUFFLE_GLYPH}Shuffle</button>` +
      `<button class="copy-btn" type="button" data-copy="google" aria-label="Copy the full RSA">Copy all</button>` +
      `</span>` +
      `</div>` +
      `<div class="serp">` +
      `<div class="serp-url"><b>Ad</b><span class="serp-dot">·</span><span id="serp-display-url"></span></div>` +
      `<div class="serp-headline" id="serp-headline"></div>` +
      `<div class="serp-desc" id="serp-desc"></div>` +
      `</div>` +
      `<p class="serp-note">Google assembles combinations automatically — shuffle to preview a rotation.</p>` +
      `</div>` +
      `<div class="k-card rsa-card reveal-item">` +
      `<div class="rsa-group">` +
      `<div class="rsa-group-head"><span class="k-label">Headlines</span><span class="k-chip google">10 × ≤30ch</span></div>` +
      heads
        .map(
          (h, i) =>
            `<div class="rsa-row"><span class="rsa-idx">${String(i + 1).padStart(2, "0")}</span>` +
            edit(`${p}.headlines.${i}`, h, { ph: "Headline", limit: LIMITS.gHead, oneLine: true }) +
            counter(`${p}.headlines.${i}`, h, LIMITS.gHead) +
            `</div>`
        )
        .join("") +
      `</div>` +
      `<div class="rsa-group">` +
      `<div class="rsa-group-head"><span class="k-label">Descriptions</span><span class="k-chip google">4 × ≤90ch</span></div>` +
      descs
        .map(
          (d, i) =>
            `<div class="rsa-row"><span class="rsa-idx">${String(i + 1).padStart(2, "0")}</span>` +
            edit(`${p}.descriptions.${i}`, d, { ph: "Description", limit: LIMITS.gDesc }) +
            counter(`${p}.descriptions.${i}`, d, LIMITS.gDesc) +
            `</div>`
        )
        .join("") +
      `</div>` +
      `<div class="rsa-paths">` +
      `<div class="rsa-path"><span class="k-label">Path 1</span><span class="path-wrap"><span class="path-slash">/</span>` +
      edit(`${p}.path1`, rsa.path1, { ph: "path-1", limit: LIMITS.gPath, oneLine: true }) +
      counter(`${p}.path1`, rsa.path1, LIMITS.gPath) +
      `</span></div>` +
      `<div class="rsa-path"><span class="k-label">Path 2</span><span class="path-wrap"><span class="path-slash">/</span>` +
      edit(`${p}.path2`, rsa.path2, { ph: "path-2", limit: LIMITS.gPath, oneLine: true }) +
      counter(`${p}.path2`, rsa.path2, LIMITS.gPath) +
      `</span></div>` +
      `<div class="rsa-path grow"><span class="k-label">CTA</span><span class="path-wrap">` +
      edit(`${p}.cta`, rsa.cta, { ph: "Call to action", oneLine: true }) +
      `</span></div>` +
      `</div>` +
      `</div>` +
      `</div>`
    );
  }

  function currentGoogle() {
    return state.campaign && state.campaign.platform_ads && state.campaign.platform_ads.google;
  }

  function updateSerpUrl() {
    const g = currentGoogle();
    const el = $("#serp-display-url");
    if (!g || !el) return;
    el.textContent = ["launchcommand.example", g.path1, g.path2]
      .map((s) => String(s == null ? "" : s).trim())
      .filter(Boolean)
      .join("/");
  }

  function setSerpPreview(heads, desc) {
    const hEl = $("#serp-headline");
    const dEl = $("#serp-desc");
    if (hEl) hEl.textContent = heads.join(" | ");
    if (dEl) dEl.textContent = desc || "";
  }

  /* initial combination: first three headlines + first description */
  function initSerp() {
    const g = currentGoogle();
    if (!g) return;
    updateSerpUrl();
    setSerpPreview((g.headlines || []).filter((h) => h && h.trim()).slice(0, 3), (g.descriptions || [])[0]);
  }

  /* re-sample 3 random headlines + 1 random description — demonstrates RSA rotation */
  function shuffleSerp() {
    const g = currentGoogle();
    if (!g) return;
    const heads = (g.headlines || []).filter((h) => h && h.trim());
    const descs = (g.descriptions || []).filter((d) => d && d.trim());
    if (!heads.length) return;
    const pool = heads.slice();
    const picks = [];
    while (picks.length < 3 && pool.length) {
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    const serp = $("#panel-google .serp");
    if (serp && !REDUCED_MOTION) {
      serp.classList.remove("flip");
      void serp.offsetWidth;
      serp.classList.add("flip");
    }
    setSerpPreview(picks, descs.length ? descs[Math.floor(Math.random() * descs.length)] : "");
  }

  /* ---------------- 02 · tiktok cards ---------------- */

  function tiktokCardEl(ad, i) {
    const p = `platform_ads.tiktok.${i}`;
    const angle = String(ad.angle || "hook").toLowerCase();
    const chipKind = angle === "story" ? "accent" : angle === "offer" ? "ok" : "warn";
    return (
      `<article class="k-card ad-card tt-card reveal-item">` +
      `<div class="card-head">` +
      `<span class="k-chip ${chipKind}">${esc(angle)}</span>` +
      `<span class="k-chip tiktok">${esc(ad.format || "Video")}</span>` +
      `<span class="k-label">Script 0${i + 1}</span>` +
      `<button class="copy-btn" type="button" data-copy="tiktok:${i}" aria-label="Copy TikTok script ${i + 1}">Copy</button>` +
      `</div>` +
      `<div class="tt-body">` +
      `<div class="tt-phone" role="img" aria-label="Vertical video preview">` +
      `<span class="tt-cam" aria-hidden="true"></span>` +
      `<div class="tt-hook">${edit(`${p}.hook`, ad.hook, { ph: "Hook line" })}</div>` +
      `<div class="tt-bottom">` +
      `<div class="tt-caption">${edit(`${p}.caption`, ad.caption, { ph: "Caption" })}</div>` +
      `<div class="tt-tags">` +
      (ad.hashtags || [])
        .map((h, j) => `<span class="ai-field one-line tt-tag" contenteditable="true" spellcheck="false" data-field="${p}.hashtags.${j}" data-placeholder="#tag">${esc(h)}</span>`)
        .join("") +
      `</div>` +
      `</div>` +
      `</div>` +
      `<div class="tt-detail">` +
      `<div class="tt-beats">` +
      `<span class="k-label">Script beats</span>` +
      (ad.script_beats || [])
        .map((b, j) => `<div class="beat-row"><span class="beat-num">${j + 1}</span>${edit(`${p}.script_beats.${j}`, b, { ph: "Beat" })}</div>`)
        .join("") +
      `</div>` +
      `<div class="tt-row">${NOTE_GLYPH}<span class="k-label">Sound</span>${edit(`${p}.sound_direction`, ad.sound_direction, { ph: "Sound direction" })}</div>` +
      `<div class="tt-row"><span aria-hidden="true"></span><span class="k-label">CTA</span>${edit(`${p}.cta`, ad.cta, { ph: "Call to action", oneLine: true })}</div>` +
      `</div>` +
      `</div>` +
      `</article>`
    );
  }

  /* ---------------- 02 · panel rendering ---------------- */

  function emptyPanel(title, desc) {
    return `<div class="k-card panel-empty"><span class="k-label">${esc(title)}</span><p>${esc(desc)}</p></div>`;
  }

  function renderPlatformAds(campaign) {
    const pm = $("#panel-meta");
    const pg = $("#panel-google");
    const pt = $("#panel-tiktok");
    if (!campaign) {
      pm.innerHTML = emptyPanel("Meta variants land here", "Three angles — hook, story, offer — rendered as editable feed previews with placement notes.");
      pg.innerHTML = emptyPanel("The Google RSA lands here", "Ten headlines and four descriptions with a live SERP preview you can shuffle.");
      pt.innerHTML = emptyPanel("TikTok scripts land here", "Three vertical scripts with hooks, beats, sound direction, and hashtags.");
      return;
    }
    const pa = campaign.platform_ads || {};
    pm.innerHTML = `<div class="ad-grid">${(pa.meta || []).map((ad, i) => metaCardEl(ad, i)).join("")}</div>`;
    pg.innerHTML = googleRsaEl(pa.google || { headlines: [], descriptions: [] });
    pt.innerHTML = `<div class="tt-grid">${(pa.tiktok || []).map((ad, i) => tiktokCardEl(ad, i)).join("")}</div>`;
    const shuffleBtn = $("#rsa-shuffle");
    if (shuffleBtn) shuffleBtn.addEventListener("click", shuffleSerp);
    initSerp();
  }

  /* skeleton shells while the first-ever generation runs */
  function skeletonPanels() {
    const sk = (lines, tall) => {
      let rows = "";
      for (let i = 0; i < lines; i++) {
        if (tall && i === 1) rows += `<div class="k-skeleton tall"></div>`;
        rows += `<div class="k-skeleton" style="width:${88 - ((i * 17) % 46)}%"></div>`;
      }
      return `<div class="k-card sk-card">${rows}</div>`;
    };
    $("#panel-meta").innerHTML = `<div class="ad-grid">${sk(4, true) + sk(4, true) + sk(4, true)}</div>`;
    $("#panel-google").innerHTML = sk(9, false);
    $("#panel-tiktok").innerHTML = `<div class="tt-grid">${sk(6, true) + sk(6, true)}</div>`;
  }

  /* ---------------- populate ---------------- */

  function populateStatic(campaign) {
    $$("#m01 .ai-field[data-field], #m03 .ai-field[data-field]").forEach((el) => {
      const value = getByPath(campaign, el.dataset.field);
      el.textContent = value != null ? String(value) : "";
    });
  }

  function updateAssetCount() {
    const c = state.campaign;
    if (!c) return;
    const pa = c.platform_ads || {};
    const ads =
      ((pa.meta || []).length) +
      ((pa.tiktok || []).length) +
      (((pa.google || {}).descriptions || []).length);
    const emails = (c.emails || []).length;
    const kpis = kpiSetCount();
    $("#asset-count").textContent =
      `${ads} ad assets · ${emails} emails ready` + (kpis ? ` · ${kpis}/${KPI_KEYS.length} KPIs set` : "");
  }

  /* ---------------- 04 · KPI targets (manual — never AI-written) ---------------- */

  const KPI_KEYS = ["reach", "ctr", "cac", "open_rate", "conv_rate", "roas"];

  function emptyKpis() {
    const kpis = {};
    KPI_KEYS.forEach((key) => { kpis[key] = { target: "", window: "" }; });
    return kpis;
  }

  function ensureKpis(campaign) {
    if (!campaign.kpis || typeof campaign.kpis !== "object") campaign.kpis = emptyKpis();
    KPI_KEYS.forEach((key) => {
      if (!campaign.kpis[key] || typeof campaign.kpis[key] !== "object") {
        campaign.kpis[key] = { target: "", window: "" };
      }
    });
    return campaign.kpis;
  }

  function kpiSetCount() {
    const kpis = state.campaign && state.campaign.kpis;
    if (!kpis) return 0;
    return KPI_KEYS.filter((key) => {
      const row = kpis[key] || {};
      return String(row.target || "").trim() || String(row.window || "").trim();
    }).length;
  }

  function populateKpis(campaign) {
    $$(".chip-input[data-kpi]").forEach((el) => {
      const value = campaign && campaign.kpis ? getByPath(campaign.kpis, el.dataset.kpi) : "";
      el.textContent = value != null ? String(value) : "";
    });
  }

  function writeKpi(el) {
    const path = el.dataset.kpi;
    if (!path) return;
    if (!state.campaign) {
      /* no campaign yet — hold the value and merge it in when one arrives */
      if (!state.pendingKpis) state.pendingKpis = emptyKpis();
      setByPath(state.pendingKpis, path, el.textContent);
      return;
    }
    ensureKpis(state.campaign);
    setByPath(state.campaign.kpis, path, el.textContent);
    updateAssetCount();
    scheduleSave();
  }

  function populateCampaign(campaign) {
    /* KPI targets entered before this campaign existed ride along with it */
    if (state.pendingKpis) {
      if (!campaign.kpis) campaign.kpis = state.pendingKpis;
      state.pendingKpis = null;
    }
    state.campaign = campaign;
    state.hasCampaign = true;
    populateStatic(campaign);
    populateKpis(campaign);
    renderPlatformAds(campaign);
    document.body.classList.add("has-campaign");
    setStale(false);
    updateAssetCount();

    /* staggered card reveal */
    AI_SECTIONS.forEach((id) => {
      const sec = $("#" + id);
      sec.classList.remove("just-generated");
      void sec.offsetWidth; // restart the animation on regeneration
      $$(".reveal-item", sec).forEach((el, i) => {
        el.style.animationDelay = `${Math.min(i * 70, 420)}ms`;
      });
      sec.classList.add("just-generated");
      setTimeout(() => sec.classList.remove("just-generated"), 2200);
    });
  }

  function setSideReadout(name, meta) {
    $("#side-campaign-name").textContent = (name || "").trim() || "Untitled campaign";
    $("#side-campaign-meta").textContent = meta;
  }

  /* ---------------- stale semantics ---------------- */

  function setStale(on) {
    AI_SECTIONS.forEach((id) => $("#" + id).classList.toggle("stale", on));
  }

  /* ---------------- generation ---------------- */

  const GEN_PHASES = [
    "Profiling the persona…",
    "Writing Meta variants…",
    "Building the Google RSA…",
    "Scripting TikTok hooks…",
    "Sequencing emails…",
    "Polishing every line…",
  ];

  let phaseTimer = null;
  let elapsedTimer = null;

  function engineHint() {
    if (state.engineMode === "api") return "~20 seconds";
    if (state.engineMode === "demo") return "No AI connected — sample data will load instantly";
    if (state.engineMode === "claude-code") return "Local engine · takes 2–5 minutes";
    return "Every output stays editable";
  }

  function workingHint() {
    if (state.engineMode === "api") return "usually ~20 seconds";
    if (state.engineMode === "demo") return "sample data loads instantly";
    if (state.engineMode === "claude-code") return "the local engine can take 2–5 minutes";
    return "hang tight";
  }

  function applyEngineHint() {
    $("#gen-hint").textContent = engineHint();
  }

  function setLoading(on) {
    AI_SECTIONS.forEach((id) => $("#" + id).classList.toggle("loading", on));
    $("#gen-btn").disabled = on;
    $("#gen-spinner").hidden = !on;
    clearInterval(phaseTimer);
    clearInterval(elapsedTimer);
    const label = $("#gen-label");
    const hint = $("#gen-hint");
    if (on) {
      if (!state.hasCampaign) skeletonPanels();
      let i = 0;
      label.textContent = GEN_PHASES[0];
      phaseTimer = setInterval(() => {
        i = (i + 1) % GEN_PHASES.length;
        label.textContent = GEN_PHASES[i];
      }, 4000);
      const t0 = Date.now();
      const tick = () => {
        const s = Math.floor((Date.now() - t0) / 1000);
        hint.textContent = `Working — ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} elapsed · ${workingHint()}`;
      };
      tick();
      elapsedTimer = setInterval(tick, 1000);
    } else {
      label.textContent = "Generate campaign";
      applyEngineHint();
      if (!state.hasCampaign) renderPlatformAds(null);
    }
  }

  function collectBrief() {
    return {
      name: $("#f-name").value,
      category: $("#f-category").value,
      price: $("#f-price").value,
      problem: $("#f-problem").value,
      mechanism: $("#f-mechanism").value,
      audience: $("#f-audience").value,
      competitor: $("#f-competitor").value,
      offer: $("#f-offer").value,
      tone: $("#f-tone").value,
    };
  }

  function fillBriefForm(brief) {
    const map = {
      name: "f-name", category: "f-category", price: "f-price", problem: "f-problem",
      mechanism: "f-mechanism", audience: "f-audience", competitor: "f-competitor",
      offer: "f-offer", tone: "f-tone",
    };
    Object.entries(map).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el && brief[key] != null) el.value = brief[key];
    });
  }

  $("#gen-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    hideDemoNotice();
    setLoading(true);
    const payload = collectBrief();
    try {
      const data = await fetchJSON("/api/v3/generate", { method: "POST", body: payload });
      const isDemo = !!data.demo;
      delete data.demo;
      /* KPI targets are manual — carry them over so a regen never wipes them */
      const prevKpis = state.campaign && state.campaign.kpis;
      if (!data.kpis && prevKpis) data.kpis = prevKpis;
      state.brief = payload;
      populateCampaign(data);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setSideReadout(payload.name, isDemo ? "Sample data · not generated" : `${payload.tone} · drafted ${time}`);
      if (isDemo) {
        showDemoNotice();
        toast("Sample data — no AI engine is connected", "warn");
      } else {
        toast("Campaign drafted — every line is editable");
      }
      $("#m01").scrollIntoView({ behavior: SCROLL_BEHAVIOR });
    } catch (err) {
      showError(err.message || "Generation failed.");
      /* never leave old data looking fresh after a failed regen */
      if (state.hasCampaign) {
        setStale(true);
        toast("Regeneration failed — the copy below is the previous draft", "danger");
      }
    } finally {
      setLoading(false);
    }
  });

  /* ---------------- "try an example" ---------------- */

  const EXAMPLE_BRIEF = {
    "f-name": "Driftwell",
    "f-category": "Weighted sleep mask with a cooling gel core",
    "f-price": "$79 one-time",
    "f-tone": "Warm and reassuring",
    "f-problem":
      "You lie awake at 2am with a racing mind, and every sleep mask you've tried either leaks light, heats up, or slides off before midnight.",
    "f-mechanism":
      "A contoured 340g micro-bead weave that applies gentle, even pressure across the brow — wrapped around a replaceable gel core that stays cool for 8 hours.",
    "f-audience": "", // intentionally blank — demonstrates persona inference
    "f-competitor": "Cheap satin masks and melatonin gummies",
    "f-offer": "Launch week: 25% off the first 500 units + a free gel refill, ends Sunday midnight",
  };

  $("#try-example").addEventListener("click", () => {
    Object.entries(EXAMPLE_BRIEF).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = value;
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
    });
    toast("Example brief loaded — audience left blank on purpose");
    $("#f-name").focus();
  });

  /* ---------------- editing + persistence ---------------- */

  async function saveCampaign() {
    if (!state.campaign) return;
    try {
      await fetchJSON("/api/v3/campaign", { method: "PUT", body: { campaign: state.campaign } });
      const pip = $("#save-pip");
      pip.classList.add("show");
      clearTimeout(saveCampaign._pipTimer);
      saveCampaign._pipTimer = setTimeout(() => pip.classList.remove("show"), 1400);
    } catch (err) {
      toast("Could not save edits — " + (err.message || "backend unreachable"), "danger");
    }
  }

  const scheduleSave = debounce(saveCampaign, 600);

  function updateCount(el) {
    const limit = Number(el.dataset.limit);
    if (!limit) return;
    const c = document.querySelector(`.char-count[data-count-for="${CSS.escape(el.dataset.field)}"]`);
    if (!c) return;
    const len = el.textContent.length;
    c.textContent = `${len}/${limit}`;
    c.classList.toggle("over", len > limit);
  }

  function handleFieldUpdate(el) {
    const path = el.dataset.field;
    if (!path || !state.campaign) return;
    setByPath(state.campaign, path, el.textContent);
    scheduleSave();
    if (path.indexOf("platform_ads.google.path") === 0) updateSerpUrl();
  }

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.classList) return;
    const isAi = el.classList.contains("ai-field");
    const isChip = el.classList.contains("chip-input");
    if (!isAi && !isChip) return;
    /* contenteditable can leave a stray <br> — normalize so :empty styling works */
    if (el.textContent.trim() === "" && el.innerHTML !== "") el.innerHTML = "";
    if (isChip) {
      writeKpi(el);
      return;
    }
    if (el.dataset.limit) updateCount(el);
    handleFieldUpdate(el);
    /* editing a stale module means the user took ownership — clear the flag */
    const sec = el.closest(".ai-module");
    if (sec && sec.classList.contains("stale")) sec.classList.remove("stale");
  });

  /* blur commits too (covers programmatic edits that skip input events) */
  document.addEventListener("focusout", (e) => {
    const el = e.target;
    if (!el.classList) return;
    if (el.classList.contains("ai-field")) handleFieldUpdate(el);
    else if (el.classList.contains("chip-input")) writeKpi(el);
  });

  /* Enter blurs single-line editables instead of inserting a line break */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const el = e.target;
    if (el.classList && (el.classList.contains("one-line") || el.classList.contains("chip-input"))) {
      e.preventDefault();
      el.blur();
    }
  });

  /* ---------------- copy ---------------- */

  function line(label, value) {
    return `${label}: ${String(value == null ? "" : value).trim()}`;
  }

  function buildCopyText(key) {
    const c = state.campaign;
    if (!c) return "";
    const [kind, idx] = key.split(":");
    const i = Number(idx);
    const pa = c.platform_ads || {};

    if (kind === "positioning") return String(c.positioning || "").trim();

    if (kind === "meta") {
      const ad = (pa.meta || [])[i];
      if (!ad) return "";
      const notes = ad.placement_notes || {};
      return [
        `Meta ad — ${ad.angle} angle`,
        line("Primary text", ad.primary_text),
        line("Headline", ad.headline),
        line("Description", ad.description),
        line("CTA button", ad.cta_button),
        line("Feed", notes.feed),
        line("Reels", notes.reels),
        line("Stories", notes.stories),
      ].join("\n");
    }

    if (kind === "google") {
      const g = pa.google;
      if (!g) return "";
      return [
        "Google responsive search ad",
        "",
        "Headlines:",
        ...(g.headlines || []).map((h, n) => `${n + 1}. ${h}`),
        "",
        "Descriptions:",
        ...(g.descriptions || []).map((d, n) => `${n + 1}. ${d}`),
        "",
        line("Display path", `/${g.path1 || ""}/${g.path2 || ""}`),
        line("CTA", g.cta),
      ].join("\n");
    }

    if (kind === "tiktok") {
      const ad = (pa.tiktok || [])[i];
      if (!ad) return "";
      return [
        `TikTok script — ${ad.angle} angle (${ad.format || "video"})`,
        line("Hook", ad.hook),
        "Beats:",
        ...(ad.script_beats || []).map((b, n) => `${n + 1}. ${b}`),
        line("Caption", ad.caption),
        line("Hashtags", (ad.hashtags || []).join(" ")),
        line("Sound", ad.sound_direction),
        line("CTA", ad.cta),
      ].join("\n");
    }

    if (kind === "email") {
      const em = (c.emails || [])[i];
      if (!em) return "";
      return [
        line("Subject", em.subject),
        line("Preview", em.preview),
        line("Goal", em.goal),
        line("Body", em.body),
        line("CTA", em.cta),
      ].join("\n");
    }

    return "";
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text = buildCopyText(btn.dataset.copy);
    if (!text) {
      toast("Nothing to copy yet — generate a campaign first", "warn");
      return;
    }
    const ok = await copyText(text);
    if (!ok) {
      showError("Could not copy to the clipboard in this browser.");
      return;
    }
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.classList.add("copied");
    btn.textContent = "Copied ✓";
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.textContent = btn.dataset.label;
    }, 1400);
    toast("Copied to clipboard");
  });

  /* ---------------- tabs ---------------- */

  const TAB_KEYS = ["meta", "google", "tiktok"];

  function selectTab(key) {
    $$(".tab-btn").forEach((b) => {
      const active = b.dataset.tab === key;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
      b.tabIndex = active ? 0 : -1;
    });
    TAB_KEYS.forEach((k) => {
      $("#panel-" + k).hidden = k !== key;
    });
  }

  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectTab(btn.dataset.tab));
  });

  /* arrow-key navigation across the tablist */
  $(".tabbar").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const current = TAB_KEYS.findIndex((k) => $(`#tab-${k}`).classList.contains("active"));
    const next = (current + (e.key === "ArrowRight" ? 1 : TAB_KEYS.length - 1)) % TAB_KEYS.length;
    selectTab(TAB_KEYS[next]);
    $(`#tab-${TAB_KEYS[next]}`).focus();
    e.preventDefault();
  });

  /* ---------------- rail nav active state ---------------- */

  const navLinks = $$('.rail-link[href^="#"]');
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);

  const activeObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`)
        );
      }
    },
    { rootMargin: "-35% 0px -55% 0px" }
  );

  sections.forEach((s) => activeObserver.observe(s));

  /* ---------------- init ---------------- */

  async function init() {
    renderPlatformAds(null);
    selectTab("meta");

    try {
      state.engineMode = await window.V3.loadEngineBadge();
    } catch {
      state.engineMode = null;
    }
    applyEngineHint();

    try {
      const data = await fetchJSON("/api/v3/campaign");
      if (data && data.campaign) {
        state.brief = data.brief || null;
        if (data.brief) fillBriefForm(data.brief);
        populateCampaign(data.campaign);
        const when = data.generated_at
          ? new Date(data.generated_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : "restored";
        setSideReadout(
          (data.brief && data.brief.name) || "Untitled campaign",
          data.demo ? "Sample data · not generated" : `${(data.brief && data.brief.tone) || "Drafted"} · ${when}`
        );
        if (data.demo) showDemoNotice();
      }
    } catch {
      /* no saved campaign — the empty states stand */
    }
  }

  init();
})();
