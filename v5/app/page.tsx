import Link from "next/link";
import {
  ArrowRight,
  Check,
  Layers,
  FileText,
  Mail,
  KanbanSquare,
  Users,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/landing/hero";
import { Faq } from "@/components/landing/faq";
import { PLAN_LIST } from "@/lib/plans";

const FEATURES = [
  { icon: Layers, title: "Campaign Workspace", body: "Persona, positioning, Meta + Google ads, and an email send-plan — the strategic anchor for the whole launch.", big: true },
  { icon: FileText, title: "Landing Page Generator", body: "CRO-grade copy with a live, editable preview. Export clean HTML." },
  { icon: Mail, title: "Email Sequences", body: "Full lifecycle emails with A/B subject lines and merge tags." },
  { icon: Users, title: "One Consistent Persona", body: "The same customer runs through every asset — no drift between channels." },
  { icon: KanbanSquare, title: "Launch Kanban", body: "Turn the plan into tasks and drag them to done." },
  { icon: Download, title: "Edit & Export", body: "Every field editable, per-section regenerate, copy or export anywhere." },
];

const OLD_WAY = [
  "Prompt for a persona in one tab",
  "Prompt for Meta ads in another",
  "Prompt for Google ads in a third",
  "Prompt for a landing page in a fourth",
  "Prompt for emails in a fifth",
  "Reconcile five different customers by hand",
];
const NEW_WAY = ["Fill in one product brief", "Generate every asset at once", "Edit inline, regenerate any section", "Ship — one persona, every channel"];
const LOGOS = ["Driftwell", "Kettle & Coal", "Northray", "Plotline", "AeroGrip", "BeanBox", "TerraHome", "TaskFlow"];

export default function LandingPage() {
  return (
    <main className="aurora relative">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-transparent backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-gradient text-sm text-white shadow-glow">▲</span>
            Launch Command
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
            <Link href="#features" className="hover:text-ink">Features</Link>
            <Link href="#how" className="hover:text-ink">How it works</Link>
            <Link href="#pricing" className="hover:text-ink">Pricing</Link>
            <Link href="#faq" className="hover:text-ink">FAQ</Link>
          </nav>
          <Button asChild size="sm">
            <Link href="/app">Try it free</Link>
          </Button>
        </div>
      </header>

      <Hero />

      {/* SOCIAL PROOF MARQUEE */}
      <section className="border-y border-line bg-bg-soft/60 py-6">
        <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Illustrative campaigns built with Launch Command
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <span key={i} className="whitespace-nowrap font-semibold tracking-tight text-ink-faint">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="how" className="container py-28">
        <header className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">The math</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Five scattered tabs, or one workspace</h2>
          <p className="mt-3 text-ink-muted">Every channel drawing from the same persona — that consistency is the whole point.</p>
        </header>
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="glass rounded-2xl p-7 opacity-80">
            <h3 className="mb-5 font-semibold">The old way</h3>
            <ul className="space-y-3">
              {OLD_WAY.map((s) => (
                <li key={s} className="flex items-start gap-3 text-sm text-ink-muted">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400/70" />
                  <span className="line-through decoration-rose-400/30">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-accent/40 bg-gradient-to-b from-accent/[0.08] to-transparent p-7 shadow-glow">
            <h3 className="mb-5 font-semibold text-ink">With Launch Command</h3>
            <ul className="space-y-3">
              {NEW_WAY.map((s) => (
                <li key={s} className="flex items-start gap-3 text-sm text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" /> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section id="features" className="container py-28">
        <header className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">Capabilities</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">An engine, not a template</h2>
        </header>
        <div className="grid auto-rows-fr gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`glass group relative overflow-hidden rounded-2xl p-7 transition-all hover:-translate-y-1 hover:border-accent/40 ${f.big ? "md:col-span-2" : ""}`}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent-cyan">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className={`mb-2 font-semibold tracking-tight text-ink ${f.big ? "text-2xl" : "text-lg"}`}>{f.title}</h3>
              <p className={`text-ink-muted ${f.big ? "max-w-lg text-base" : "text-sm"}`}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container py-28">
        <header className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">Pricing</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Start free. Scale when it works.</h2>
        </header>
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {PLAN_LIST.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl p-7 ${p.highlight ? "border border-accent/50 bg-gradient-to-b from-accent/[0.08] to-transparent shadow-glow" : "glass"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-accent/50 bg-bg px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent-cyan">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">${p.price}</span>
                <span className="font-mono text-xs text-ink-faint">/mo</span>
              </div>
              <p className="mt-2 min-h-10 text-sm text-ink-muted">{p.blurb}</p>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink-muted">
                    <Check className="h-4 w-4 shrink-0 text-accent-cyan" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? "primary" : "ghost"} className="mt-7 w-full">
                <Link href="/app">{p.price === 0 ? "Start free" : "Join the waitlist"}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Billing goes live soon — paid tiers currently join a waitlist.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-28">
        <header className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">FAQ</p>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Fair questions, straight answers</h2>
        </header>
        <Faq />
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-line py-28">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,92,255,0.16),transparent)] blur-3xl" />
        <div className="container text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">Your next campaign is one form away.</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-muted">Brief it once. Watch every channel fill itself in.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/app">Generate my campaign free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line py-12">
        <div className="container flex flex-col items-center justify-between gap-6 text-sm text-ink-faint md:flex-row">
          <div className="flex items-center gap-2 font-semibold text-ink-muted">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent-gradient text-[10px] text-white">▲</span>
            Launch Command
          </div>
          <nav className="flex gap-6">
            <Link href="/app" className="hover:text-ink">App</Link>
            <Link href="#pricing" className="hover:text-ink">Pricing</Link>
            <Link href="#faq" className="hover:text-ink">FAQ</Link>
          </nav>
          <p className="font-mono text-[10px] uppercase tracking-widest">© 2026 Launch Command · Pre-launch</p>
        </div>
      </footer>
    </main>
  );
}
