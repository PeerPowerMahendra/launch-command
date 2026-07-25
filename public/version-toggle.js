/* Floating version switcher — shared by v2 (/) and v3 (/v3/...). Self-styling, no deps. */
(function () {
  "use strict";

  var onV3 = location.pathname.indexOf("/v3") === 0;

  var style = document.createElement("style");
  style.textContent =
    ".lc-version-pill{position:fixed;top:14px;right:14px;z-index:99999;display:flex;align-items:center;" +
    "gap:2px;padding:3px;border-radius:999px;background:rgba(16,20,28,.92);border:1px solid rgba(255,255,255,.14);" +
    "box-shadow:0 4px 18px rgba(0,0,0,.35);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
    "font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;}" +
    ".lc-version-pill a{display:block;padding:5px 12px;border-radius:999px;text-decoration:none;" +
    "color:rgba(237,241,250,.55);transition:color .15s ease,background .15s ease;}" +
    ".lc-version-pill a:hover{color:#EDF1FA;}" +
    ".lc-version-pill a.on{background:#5B7CFF;color:#fff;}" +
    "@media (max-width:900px){.lc-version-pill{top:auto;bottom:14px;right:14px;}}";

  var pill = document.createElement("nav");
  pill.className = "lc-version-pill";
  pill.setAttribute("aria-label", "Version switcher");
  pill.innerHTML =
    '<a href="/" class="' + (onV3 ? "" : "on") + '" title="v2 · Campaign workspace">V2</a>' +
    '<a href="/v3/" class="' + (onV3 ? "on" : "") + '" title="v3 · Multi-platform launch suite">V3</a>';

  function mount() {
    document.head.appendChild(style);
    document.body.appendChild(pill);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
