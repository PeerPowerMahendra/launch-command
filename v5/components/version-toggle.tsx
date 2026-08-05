"use client";

/**
 * Floating version switcher, matching the v3/v4 pill.
 * V3 + V4 live on the static Netlify site; V5 (this Next.js app) is active.
 * Override the legacy base with NEXT_PUBLIC_LEGACY_BASE_URL if it moves.
 */
const LEGACY = process.env.NEXT_PUBLIC_LEGACY_BASE_URL || "https://launch-command-suite.netlify.app";

const LINKS = [
  { label: "V3", href: `${LEGACY}/v3/`, active: false },
  { label: "V4", href: `${LEGACY}/v4/`, active: false },
  { label: "V5", href: "/", active: true },
];

export function VersionToggle() {
  return (
    <nav
      aria-label="Version switcher"
      className="fixed right-3.5 top-3.5 z-[9999] flex items-center gap-0.5 rounded-full border border-white/15 bg-black/80 p-1 font-mono text-[10px] uppercase tracking-widest shadow-[0_4px_18px_rgba(0,0,0,0.4)] backdrop-blur-md max-[900px]:bottom-3.5 max-[900px]:right-3.5 max-[900px]:top-auto"
    >
      {LINKS.map((l) => (
        <a
          key={l.label}
          href={l.href}
          className={`rounded-full px-3 py-1.5 transition-colors ${l.active ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
          title={`Launch Command ${l.label}`}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
