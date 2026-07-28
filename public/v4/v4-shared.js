/* ================================================================
   LAUNCH COMMAND v3 — shared frontend utilities
   Classic script (no modules). Attaches window.V3. Load before page JS.
   ================================================================ */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- toasts ---------------- */

  function toastStack() {
    let stack = $("#toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toast-stack";
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(msg, kind = "ok") {
    const t = document.createElement("div");
    t.className = `toast toast-${kind}`;
    t.textContent = msg;
    toastStack().appendChild(t);
    setTimeout(() => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 320);
    }, 2800);
  }

  /* ---------------- fetch ---------------- */

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    // streamed endpoints report failures as 200 + {error} (see engine.js streamJson)
    if (!res.ok || (data && data.error)) {
      const err = new Error(data.error || `Request failed (HTTP ${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ---------------- object paths (numeric segments → array indices) ---------------- */

  function getByPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  function setByPath(obj, path, value) {
    const keys = path.split(".");
    let node = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (node[key] == null) {
        node[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      }
      node = node[key];
    }
    node[keys[keys.length - 1]] = value;
  }

  /* ---------------- clipboard ---------------- */

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { /* no-op */ }
      ta.remove();
      return ok;
    }
  }

  /* ---------------- misc ---------------- */

  function debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* Compact number: 1234 → "1.2k", 1200000 → "1.2M" */
  function fmtCompact(n) {
    if (n == null || isNaN(n)) return "—";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(Math.round(n));
  }

  function fmtMoney(n) {
    if (n == null || isNaN(n)) return "—";
    return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* Count-up animation for stat numbers (snaps under reduced motion). */
  function countUp(el, target, { duration = 1200, format = (v) => Math.round(v).toLocaleString() } = {}) {
    if (REDUCED_MOTION || duration <= 0) {
      el.textContent = format(target);
      return;
    }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- sparkline SVG ---------------- */
  /* series: number[] → returns an <svg> string (viewBox 100×28, no libs). */
  function sparklineSVG(series, { stroke = "var(--accent)", fill = "rgba(91,124,255,0.15)" } = {}) {
    if (!Array.isArray(series) || series.length < 2) return "";
    const w = 100, h = 28, pad = 2;
    const max = Math.max(...series, 1);
    const min = Math.min(...series, 0);
    const range = max - min || 1;
    const pts = series.map((v, i) => {
      const x = pad + (i / (series.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    });
    const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + " " + p[1]).join(" ");
    const area = line + ` L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`;
    return (
      `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">` +
      `<path d="${area}" fill="${fill}" stroke="none"></path>` +
      `<path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"></path>` +
      `</svg>`
    );
  }

  /* ---------------- engine badge (shared rail element) ---------------- */

  async function loadEngineBadge() {
    const badge = $("#engine-badge");
    if (!badge) return null;
    const text = $("#engine-text");
    try {
      const { mode } = await fetchJSON("/api/status");
      badge.dataset.mode = mode === "api" ? "api" : mode === "demo" ? "demo" : "local";
      if (text) {
        text.textContent =
          mode === "api" ? "Engine · Anthropic API"
          : mode === "demo" ? "Engine · Demo (no AI)"
          : "Engine · Local Claude Code";
      }
      return mode;
    } catch {
      if (text) text.textContent = "Engine · offline";
      return null;
    }
  }

  window.V3 = {
    $, $$, REDUCED_MOTION,
    toast, fetchJSON, getByPath, setByPath, copyText,
    debounce, fmtCompact, fmtMoney, countUp, sparklineSVG,
    loadEngineBadge,
  };
})();
