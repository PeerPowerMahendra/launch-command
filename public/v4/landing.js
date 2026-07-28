/* Launch Command v3 — landing page behavior */
(function () {
  "use strict";
  const { $, $$, countUp, REDUCED_MOTION } = window.V3;

  /* ---------- sticky nav ---------- */
  const nav = $("#top-nav");
  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- scroll reveals ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08 }
  );
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- hero stat counters (once, on view) ---------- */
  const statsObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        statsObserver.unobserve(entry.target);
        $$(".stat-num", entry.target).forEach((el, i) => {
          const target = Number(el.dataset.count) || 0;
          setTimeout(() => countUp(el, target, { duration: 900 }), i * 120);
        });
      }
    },
    { threshold: 0.4 }
  );
  const heroStats = $("#hero-stats");
  if (heroStats) statsObserver.observe(heroStats);

  /* ---------- compare totals ---------- */
  function fmtTotal(fmt) {
    if (fmt === "hm") {
      return (v) => {
        const mins = Math.round(v);
        return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
      };
    }
    return (v) => `${Math.round(v)} min`;
  }

  const totalsObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        totalsObserver.unobserve(entry.target);
        const el = entry.target;
        countUp(el, Number(el.dataset.total) || 0, {
          duration: 1400,
          format: fmtTotal(el.dataset.fmt),
        });
      }
    },
    { threshold: 0.6 }
  );
  $$(".total-num").forEach((el) => totalsObserver.observe(el));

  /* ---------- testimonial carousel ---------- */
  const track = $("#car-track");
  const slides = $$(".t-slide", track);
  const dotsWrap = $("#car-dots");
  const carousel = $("#carousel");
  let index = 0;
  let timer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "car-dot" + (i === 0 ? " on" : "");
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to story ${i + 1}`);
    dot.addEventListener("click", () => go(i, true));
    dotsWrap.appendChild(dot);
  });
  const dots = $$(".car-dot", dotsWrap);

  function go(i, manual = false) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle("on", di === index));
    if (manual) restart();
  }

  function restart() {
    clearInterval(timer);
    if (!REDUCED_MOTION) timer = setInterval(() => go(index + 1), 6000);
  }

  $("#car-prev").addEventListener("click", () => go(index - 1, true));
  $("#car-next").addEventListener("click", () => go(index + 1, true));

  carousel.addEventListener("mouseenter", () => clearInterval(timer));
  carousel.addEventListener("mouseleave", restart);
  carousel.addEventListener("focusin", () => clearInterval(timer));
  carousel.addEventListener("focusout", restart);
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, true); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, true); }
  });

  restart();
})();
