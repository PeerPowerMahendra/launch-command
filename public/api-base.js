/* Points the frontend at the right backend.
   - On localhost: same-origin (the Express server serving this page).
   - On the public site (Netlify): the tunnel to the machine running
     `npm run dev` — that machine's local Claude does the generating.
   Set TUNNEL_API_BASE at deploy time; leave "" to disable. */
(function () {
  "use strict";

  var TUNNEL_API_BASE = "https://acquisition-ink-cad-encourage.trycloudflare.com"; // set before `netlify deploy`

  var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var base = !isLocal && /^https:/.test(TUNNEL_API_BASE) ? TUNNEL_API_BASE.replace(/\/$/, "") : "";
  window.LC_API_BASE = base;
  if (!base) return;

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === "string" && input.indexOf("/api/") === 0) {
      input = base + input;
    }
    return origFetch(input, init);
  };
})();
