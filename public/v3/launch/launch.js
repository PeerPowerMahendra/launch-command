/* Launch Command v3 — launch console behavior */
(function () {
  "use strict";
  const { $, $$, toast, fetchJSON, fmtCompact, fmtMoney, sparklineSVG, loadEngineBadge } = window.V3;

  const PLATFORMS = {
    meta: {
      label: "Meta Ads Manager", hue: "var(--p-meta)", soft: "var(--p-meta-soft)", chip: "meta",
      glyph: '<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="5.8" cy="8" r="3.4" stroke="currentColor" stroke-width="1.5"/><circle cx="10.2" cy="8" r="3.4" stroke="currentColor" stroke-width="1.5"/></svg>',
    },
    google: {
      label: "Google Ads", hue: "var(--p-google)", soft: "var(--p-google-soft)", chip: "google",
      glyph: '<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><rect x="2.75" y="2.75" width="4.3" height="4.3" rx="1.1" stroke="currentColor" stroke-width="1.5"/><rect x="8.95" y="2.75" width="4.3" height="4.3" rx="1.1" stroke="currentColor" stroke-width="1.5"/><rect x="2.75" y="8.95" width="4.3" height="4.3" rx="1.1" stroke="currentColor" stroke-width="1.5"/><rect x="8.95" y="8.95" width="4.3" height="4.3" rx="2.15" stroke="currentColor" stroke-width="1.5"/></svg>',
    },
    tiktok: {
      label: "TikTok Ads", hue: "var(--p-tiktok)", soft: "var(--p-tiktok-soft)", chip: "tiktok",
      glyph: '<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M4 6.2v3.6M8 3.2v9.6M12 5.2v5.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    },
  };

  const STAGE_LABELS = ["Validating copy", "Uploading creative", "Policy review", "Learning phase", "Live"];

  let accounts = {};
  let campaign = null;
  let brief = null;
  let launches = [];
  const selected = new Set(); // keys: "platform:index"
  const liveSeen = new Set();
  let fastPoll = null;
  let slowPoll = null;
  let tilesAnimated = false;

  /* ================= accounts ================= */

  function acctCardEl(key) {
    const meta = PLATFORMS[key];
    const acct = accounts[key] || { connected: false };
    const card = document.createElement("div");
    card.className = `k-card acct-card ${acct.connected ? "on" : "off"}`;
    card.style.setProperty("--tint", meta.hue);
    card.style.setProperty("--tint-soft", meta.soft);

    card.innerHTML = `
      <div class="acct-head">
        <span class="acct-glyph" aria-hidden="true">${meta.glyph}</span>
        <div>
          <div class="acct-name">${meta.label}</div>
          <div class="acct-state">
            <span class="k-dot ${acct.connected ? "live" : "off"}"></span>
            ${acct.connected ? "Connected" : "Not connected"}
          </div>
        </div>
      </div>
      ${acct.connected
        ? `<div class="acct-detail">${acct.account_name} <span>· ${acct.account_id}</span></div>`
        : ""}
      <button class="k-btn-ghost ${acct.connected ? "danger" : ""}" type="button">
        ${acct.connected ? "Disconnect" : "Connect"}
      </button>`;

    const btn = card.querySelector("button");
    btn.addEventListener("click", async () => {
      if (acct.connected) {
        if (!confirm(`Disconnect ${meta.label}?`)) return;
        try {
          const data = await fetchJSON(`/api/v3/accounts/${key}`, { method: "PUT", body: { connected: false } });
          accounts = data.accounts;
          renderAccounts();
          renderComposer();
          toast(`${meta.label} disconnected`, "warn");
        } catch (err) { toast(err.message, "danger"); }
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="acct-spin"></span>&nbsp; Authorizing…';
      setTimeout(async () => {
        try {
          const data = await fetchJSON(`/api/v3/accounts/${key}`, { method: "PUT", body: { connected: true } });
          accounts = data.accounts;
          renderAccounts();
          renderComposer();
          toast(`${meta.label} connected`);
        } catch (err) {
          toast(err.message, "danger");
          renderAccounts();
        }
      }, 1200);
    });

    return card;
  }

  function renderAccounts() {
    const grid = $("#acct-grid");
    grid.innerHTML = "";
    grid.removeAttribute("aria-busy");
    Object.keys(PLATFORMS).forEach((key) => grid.appendChild(acctCardEl(key)));
  }

  /* ================= composer ================= */

  function buildUnits() {
    if (!campaign) return [];
    const pa = campaign.platform_ads;
    const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
    const units = [];
    (pa.meta || []).forEach((ad, i) =>
      units.push({ platform: "meta", ad_index: i, name: `Meta · ${cap(ad.angle)}-led`, preview: ad.headline }));
    if (pa.google) {
      units.push({ platform: "google", ad_index: 0, name: "Google · RSA — 10 headlines", preview: pa.google.headlines[0] });
    }
    (pa.tiktok || []).forEach((ad, i) =>
      units.push({ platform: "tiktok", ad_index: i, name: `TikTok · ${cap(ad.angle)}-led`, preview: ad.hook }));
    return units;
  }

  function renderComposer() {
    const body = $("#composer-body");
    const bar = $("#launch-bar");

    if (!campaign) {
      body.innerHTML = `<div class="k-card lc-empty"><p>No campaign yet — <a href="/v3/app/">brief one in the workspace →</a></p></div>`;
      bar.hidden = true;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "unit-grid";

    for (const unit of buildUnits()) {
      const key = `${unit.platform}:${unit.ad_index}`;
      const meta = PLATFORMS[unit.platform];
      const connected = accounts[unit.platform] && accounts[unit.platform].connected;
      if (!connected) selected.delete(key);

      const card = document.createElement("div");
      card.className = `k-card unit-card ${selected.has(key) ? "selected" : ""} ${connected ? "" : "disabled"}`;
      card.style.setProperty("--tint", meta.hue);
      card.setAttribute("role", "checkbox");
      card.setAttribute("aria-checked", selected.has(key) ? "true" : "false");
      card.tabIndex = connected ? 0 : -1;

      card.innerHTML = `
        <div class="unit-top">
          <span class="k-chip ${meta.chip}">${unit.platform}</span>
          <span class="unit-check" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </div>
        <div class="unit-name">${unit.name}</div>
        <div class="unit-preview">${unit.preview || ""}</div>
        ${connected ? "" : `<span class="unit-lock">Connect ${unit.platform} first</span>`}`;

      function toggle() {
        if (!connected) return;
        if (selected.has(key)) selected.delete(key);
        else selected.add(key);
        card.classList.toggle("selected", selected.has(key));
        card.setAttribute("aria-checked", selected.has(key) ? "true" : "false");
        updateBar();
      }

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
      });

      grid.appendChild(card);
    }

    body.innerHTML = "";
    body.appendChild(grid);
    bar.hidden = false;
    updateBar();
  }

  function updateBar() {
    $("#launch-count").textContent = `${selected.size} selected`;
    $("#launch-btn").disabled = selected.size === 0;
    $("#launch-error").hidden = true;
  }

  async function doLaunch() {
    const units = buildUnits();
    const items = [...selected].map((key) => {
      const [platform, idx] = key.split(":");
      const unit = units.find((u) => u.platform === platform && u.ad_index === Number(idx));
      return { platform, ad_index: Number(idx), name: unit ? unit.name : `${platform} ad` };
    });

    const btn = $("#launch-btn");
    btn.disabled = true;
    try {
      const record = await fetchJSON("/api/v3/launch", {
        method: "POST",
        body: { items, budget_daily: Number($("#budget-input").value) || 50 },
      });
      selected.clear();
      renderComposer();
      toast(`Launch ${record.id} started — ${record.items.length} item${record.items.length > 1 ? "s" : ""}`);
      await refreshLaunches();
      startFastPoll();
      $("#queue-block").scrollIntoView({ behavior: window.V3.REDUCED_MOTION ? "auto" : "smooth", block: "start" });
    } catch (err) {
      const errEl = $("#launch-error");
      errEl.textContent = err.message;
      errEl.hidden = false;
      toast(err.message, "danger");
      btn.disabled = selected.size === 0;
    }
  }

  $("#launch-btn").addEventListener("click", doLaunch);

  /* ================= queue ================= */

  function qItemEl(item) {
    const meta = PLATFORMS[item.platform];
    const row = document.createElement("div");
    row.className = "k-card q-item";

    const segs = STAGE_LABELS.map((_, si) => {
      let cls = "q-seg";
      if (item.step_index >= STAGE_LABELS.length - 1) cls += si === STAGE_LABELS.length - 1 ? " live-seg" : " done";
      else if (si < item.step_index) cls += " done";
      else if (si === item.step_index) cls += " current";
      return `<span class="${cls}"></span>`;
    }).join("");

    const chip = item.status === "live"
      ? '<span class="k-chip ok">Live</span>'
      : item.status === "launching"
        ? '<span class="k-chip accent">Launching</span>'
        : '<span class="k-chip">Queued</span>';

    row.innerHTML = `
      <div class="q-ident">
        <span class="k-chip ${meta.chip}">${item.platform}</span>
        <span class="q-name">${item.name}</span>
      </div>
      <div class="q-progress">
        <div class="q-bar">${segs}</div>
        <span class="q-step">${item.current_step}</span>
      </div>
      ${chip}`;
    return row;
  }

  function renderQueue() {
    const body = $("#queue-body");
    const active = launches.find((r) => r.status !== "live") || launches[0];
    if (!active) {
      body.innerHTML = `<div class="k-card lc-empty"><p>No active pipeline. Select units above and hit launch.</p></div>`;
      return;
    }
    const list = document.createElement("div");
    list.className = "q-list";
    active.items.forEach((item) => list.appendChild(qItemEl(item)));
    body.innerHTML = "";
    body.appendChild(list);

    // toast items that just went live
    for (const item of active.items) {
      const key = `${active.id}:${item.id}`;
      if (item.status === "live" && !liveSeen.has(key)) {
        liveSeen.add(key);
        toast(`${item.name} is live`);
      } else if (item.status === "live") {
        liveSeen.add(key);
      }
    }
  }

  /* ================= history ================= */

  function renderHistory() {
    const body = $("#history-body");
    if (!launches.length) {
      body.innerHTML = `<div class="k-card lc-empty"><p>No launches yet.</p></div>`;
      return;
    }
    body.innerHTML = "";
    for (const r of launches) {
      const platforms = [...new Set(r.items.map((i) => i.platform))];
      const det = document.createElement("details");
      det.className = "k-card h-record";
      const rollup = r.status === "live"
        ? '<span class="k-chip ok">Live</span>'
        : r.status === "launching"
          ? '<span class="k-chip accent">Launching</span>'
          : '<span class="k-chip">Queued</span>';
      det.innerHTML = `
        <summary>
          <span class="h-id">${r.id}</span>
          <span class="h-camp">${r.campaign_name} · ${r.items.length} item${r.items.length > 1 ? "s" : ""}</span>
          <span class="h-chips">${platforms.map((p) => `<span class="k-chip ${PLATFORMS[p].chip}">${p}</span>`).join("")}</span>
          <span class="h-time">${new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          ${rollup}
        </summary>
        <div class="h-items">
          ${r.items.map((i) => `
            <div class="h-item-row">
              <span class="k-chip ${PLATFORMS[i.platform].chip}">${i.platform}</span>
              <span class="grow">${i.name}</span>
              <span>${i.status === "live" && i.metrics ? `${fmtCompact(i.metrics.impressions)} impr · ${fmtMoney(i.metrics.spend)} · ${i.metrics.roas}× ROAS` : i.current_step}</span>
            </div>`).join("")}
        </div>`;
      body.appendChild(det);
    }
  }

  $("#reset-btn").addEventListener("click", async () => {
    if (!confirm("Reset the simulation? This clears all launches and disconnects every account.")) return;
    try {
      await fetchJSON("/api/v3/reset", { method: "POST" });
      liveSeen.clear();
      selected.clear();
      tilesAnimated = false;
      await Promise.all([refreshAccounts(), refreshLaunches()]);
      renderAccounts();
      renderComposer();
      toast("Simulation reset", "warn");
    } catch (err) { toast(err.message, "danger"); }
  });

  /* ================= analytics ================= */

  function liveItems() {
    const out = [];
    for (const r of launches) {
      for (const i of r.items) {
        if (i.status === "live" && i.metrics) out.push({ ...i, launch_id: r.id });
      }
    }
    return out;
  }

  function sumSeries(items, kind) {
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    for (const item of items) {
      (item.metrics.series[kind] || []).forEach((v, i) => { buckets[i] += v; });
    }
    return buckets;
  }

  /* KPI targets (set in the workspace) vs simulated live actuals */
  function kpiStripHTML(items) {
    const kpis = campaign && campaign.kpis;
    if (!kpis) return "";

    const totalImpr = items.reduce((s, i) => s + i.metrics.impressions, 0);
    const totalClicks = items.reduce((s, i) => s + i.metrics.clicks, 0);
    const totalSpend = items.reduce((s, i) => s + i.metrics.spend, 0);
    const totalConv = items.reduce((s, i) => s + i.metrics.conversions, 0);
    const avgRoas = items.reduce((s, i) => s + i.metrics.roas, 0) / items.length;

    const parseTarget = (s) => {
      const m = String(s || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([kKmM%×x]?)/);
      if (!m) return null;
      let v = parseFloat(m[1]);
      if (/k/i.test(m[2])) v *= 1e3;
      if (/m/i.test(m[2])) v *= 1e6;
      return v;
    };

    const rows = [
      { key: "reach",     label: "Launch reach",  actual: totalImpr,                                    fmt: fmtCompact,                        higherIsBetter: true },
      { key: "ctr",       label: "CTR",           actual: totalImpr ? (totalClicks / totalImpr) * 100 : null, fmt: (v) => v.toFixed(2) + "%",   higherIsBetter: true },
      { key: "cac",       label: "CAC",           actual: totalConv ? totalSpend / totalConv : null,    fmt: fmtMoney,                          higherIsBetter: false },
      { key: "open_rate", label: "Email opens",   actual: null,                                         fmt: (v) => v,                          higherIsBetter: true },
      { key: "conv_rate", label: "Conv. rate",    actual: totalClicks ? (totalConv / totalClicks) * 100 : null, fmt: (v) => v.toFixed(2) + "%", higherIsBetter: true },
      { key: "roas",      label: "ROAS",          actual: avgRoas,                                      fmt: (v) => v.toFixed(2) + "×",         higherIsBetter: true },
    ];

    const cells = rows.map((r) => {
      const kpi = kpis[r.key] || {};
      const targetNum = parseTarget(kpi.target);
      const hasTarget = kpi.target && String(kpi.target).trim() !== "";
      let stateChip = "";
      if (r.actual == null) {
        stateChip = '<span class="k-chip">Not tracked</span>';
      } else if (hasTarget && targetNum != null) {
        const met = r.higherIsBetter ? r.actual >= targetNum : r.actual <= targetNum;
        stateChip = met
          ? '<span class="k-chip ok">On target</span>'
          : '<span class="k-chip warn">Off target</span>';
      }
      return `
        <div class="kpi-cell">
          <span class="k-label">${r.label}</span>
          <div class="kpi-vals">
            <b>${r.actual == null ? "—" : r.fmt(r.actual)}</b>
            <span class="kpi-target">${hasTarget ? "target " + kpi.target : "no target set"}</span>
          </div>
          ${stateChip}
          ${kpi.window ? `<span class="kpi-window">${kpi.window}</span>` : ""}
        </div>`;
    }).join("");

    return `
      <div class="k-card kpi-strip">
        <div class="kpi-strip-head">
          <span class="k-label">KPI targets vs live</span>
          <a class="kpi-edit" href="/v3/app/#m04">Edit targets →</a>
        </div>
        <div class="kpi-grid">${cells}</div>
      </div>`;
  }

  function renderAnalytics() {
    const body = $("#analytics-body");
    const items = liveItems();
    $("#analytics-footnote").hidden = items.length === 0;
    if (!items.length) {
      body.innerHTML = `<div class="k-card lc-empty"><p>Nothing live yet — launch your first ad.</p></div>`;
      return;
    }

    const totalSpend = items.reduce((s, i) => s + i.metrics.spend, 0);
    const totalImpr = items.reduce((s, i) => s + i.metrics.impressions, 0);
    const totalConv = items.reduce((s, i) => s + i.metrics.conversions, 0);
    const avgRoas = items.reduce((s, i) => s + i.metrics.roas, 0) / items.length;
    const maxRoas = Math.max(...items.map((i) => i.metrics.roas), avgRoas) * 1.15;

    const tiles = [
      { label: "Total spend", value: fmtMoney(totalSpend), series: sumSeries(items, "spend") },
      { label: "Impressions", value: fmtCompact(totalImpr), series: sumSeries(items, "impressions") },
      { label: "Avg ROAS", value: avgRoas.toFixed(2) + "×", series: sumSeries(items, "roas") },
      { label: "Conversions", value: fmtCompact(totalConv), series: sumSeries(items, "impressions").map((v, i) => Math.round(v * 0.02 + i)) },
    ];

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      ${kpiStripHTML(items)}
      <div class="stat-tiles">
        ${tiles.map((t) => `
          <div class="k-card stat-tile">
            <span class="k-label tile-label">${t.label}</span>
            <div class="tile-num">${t.value}</div>
            <div class="tile-spark">${sparklineSVG(t.series, { stroke: "#5B7CFF", fill: "rgba(91,124,255,0.15)" })}</div>
          </div>`).join("")}
      </div>
      <div class="perf-grid">
        ${items.map((item) => {
          const meta = PLATFORMS[item.platform];
          const m = item.metrics;
          const maxSpend = Math.max(...m.series.spend, 0.01);
          return `
          <div class="k-card perf-card" style="--tint: ${meta.hue}">
            <div class="perf-head">
              <span class="k-chip ${meta.chip}">${item.platform}</span>
              <span class="perf-name">${item.name}</span>
              ${item.angle ? `<span class="k-chip">${item.angle}</span>` : ""}
            </div>
            <div class="metric-row">
              <div class="metric"><b>${m.ctr}%</b><span>CTR</span></div>
              <div class="metric"><b>${m.cpm != null ? fmtMoney(m.cpm) : fmtMoney(m.cpc)}</b><span>${m.cpm != null ? "CPM" : "CPC"}</span></div>
              <div class="metric"><b>${fmtCompact(m.conversions)}</b><span>Conv</span></div>
              <div class="metric"><b>${m.roas}×</b><span>ROAS</span></div>
            </div>
            <div class="roas-row">
              <span class="k-label">ROAS vs campaign avg</span>
              <div class="roas-track">
                <div class="roas-fill" style="width:${Math.min((m.roas / maxRoas) * 100, 100)}%"></div>
                <div class="roas-avg" style="left:${Math.min((avgRoas / maxRoas) * 100, 100)}%" title="Campaign average"></div>
              </div>
            </div>
            <span class="k-label">Daily spend</span>
            <div class="spend-bars" style="margin-top:6px">
              ${m.series.spend.map((v) => `<div class="spend-bar" style="height:${Math.max((v / maxSpend) * 100, 4)}%"></div>`).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>`;

    body.innerHTML = "";
    body.appendChild(wrap);
    tilesAnimated = true;
  }

  /* ================= data + polling ================= */

  async function refreshAccounts() {
    accounts = (await fetchJSON("/api/v3/accounts")).accounts;
  }

  async function refreshCampaign() {
    const data = await fetchJSON("/api/v3/campaign");
    campaign = data.campaign;
    brief = data.brief;
  }

  async function refreshLaunches() {
    launches = (await fetchJSON("/api/v3/launches")).launches;
    renderQueue();
    renderHistory();
    renderAnalytics();
  }

  function anyInFlight() {
    return launches.some((r) => r.items.some((i) => i.status !== "live"));
  }

  function startFastPoll() {
    clearInterval(fastPoll);
    fastPoll = setInterval(async () => {
      try {
        await refreshLaunches();
        if (!anyInFlight()) {
          clearInterval(fastPoll);
          fastPoll = null;
          startSlowPoll();
        }
      } catch { /* transient — keep polling */ }
    }, 1200);
  }

  function startSlowPoll() {
    clearInterval(slowPoll);
    slowPoll = setInterval(async () => {
      try {
        await refreshCampaign(); // pick up KPI target edits made in the workspace
        await refreshLaunches();
      } catch { /* transient */ }
    }, 10000);
  }

  /* ================= nav active state ================= */

  const navLinks = $$('.rail-link[href^="#"]');
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const navObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
      }
    },
    { rootMargin: "-30% 0px -60% 0px" }
  );
  sections.forEach((s) => navObserver.observe(s));

  /* ================= init ================= */

  (async function init() {
    loadEngineBadge();
    try {
      await Promise.all([refreshAccounts(), refreshCampaign()]);
      renderAccounts();
      renderComposer();
      await refreshLaunches();
      // mark already-live items as seen so we don't toast history on load
      for (const r of launches) for (const i of r.items) if (i.status === "live") liveSeen.add(`${r.id}:${i.id}`);
      if (anyInFlight()) startFastPoll();
      else if (liveItems().length) startSlowPoll();
    } catch (err) {
      toast("Could not reach the backend — is the server running?", "danger");
    }
  })();
})();
