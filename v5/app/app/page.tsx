"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GENERATOR_LIST, type PageType } from "@/lib/generators";
import { BRAND_TONES } from "@/lib/generators/types";

const SHARED = [
  { name: "product_name", label: "Product / brand name", placeholder: "e.g. Driftwell", required: true },
  { name: "category", label: "Category", placeholder: "e.g. Weighted sleep mask", required: true },
  { name: "price", label: "Price", placeholder: "e.g. $79 one-time", required: true },
  { name: "offer", label: "Launch offer", placeholder: "e.g. 25% off launch week" },
  { name: "core_problem", label: "Core problem it solves", placeholder: "The painful problem your customer has now", required: true, textarea: true },
  { name: "usp", label: "Unique selling point / mechanism", placeholder: "What makes it actually work", required: true, textarea: true },
  { name: "target_audience", label: "Target audience (optional)", placeholder: "Leave blank and the AI infers it", textarea: true },
] as const;

export default function AppPage() {
  const [active, setActive] = useState<PageType>("campaign_workspace");
  const [form, setForm] = useState<Record<string, string>>({ brand_tone: BRAND_TONES[0] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<unknown>(null);
  const [engine, setEngine] = useState<string>("");

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setEngine(d.mode))
      .catch(() => setEngine("none"));
  }, []);

  const engineLabel =
    engine === "api"
      ? "Engine · Anthropic API"
      : engine === "claude-code"
        ? "Engine · Local Claude Code"
        : engine === "none"
          ? "Engine · not connected"
          : "";

  const generator = GENERATOR_LIST.find((g) => g.id === active)!;
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function generate() {
    setLoading(true);
    setError(null);
    setOutput(null);
    const campaign = {
      product_name: form.product_name || "",
      category: form.category || "",
      price: form.price || "",
      offer: form.offer || "",
      core_problem: form.core_problem || "",
      usp: form.usp || "",
      target_audience: form.target_audience || "",
      brand_tone: form.brand_tone || BRAND_TONES[0],
    };
    const extra: Record<string, string> = {};
    generator.formFields.forEach((f) => (extra[f.name] = form[f.name] || ""));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: active, campaign, extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "limit_reached" ? "You've hit your free plan limit — upgrade to keep generating." : data.error || "Generation failed.");
      setOutput(data.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  function loadExample() {
    setForm({
      product_name: "Driftwell",
      category: "Weighted sleep mask with a cooling gel core",
      price: "$79 one-time",
      offer: "25% off the first 500 units, ends Sunday",
      core_problem: "You lie awake at 2am with a racing mind; every mask leaks light, heats up, or slides off.",
      usp: "A 340g micro-bead weave applies gentle even pressure over a gel core that stays cool for 8 hours.",
      target_audience: "",
      brand_tone: "Warm and reassuring",
      seo_keywords: "weighted sleep mask, cooling eye mask",
      page_goal: "Purchase",
      sequence_type: "Welcome",
      email_count: "3",
      tone: "warm, reassuring",
    });
  }

  return (
    <div className="aurora relative min-h-screen">
      <header className="border-b border-line">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Launch Command
          </Link>
          <div className="flex items-center gap-4">
            {engineLabel && (
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                <span className={`h-1.5 w-1.5 rounded-full ${engine === "api" ? "bg-emerald-400" : engine === "claude-code" ? "bg-amber-400" : "bg-rose-400"}`} />
                {engineLabel}
              </span>
            )}
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Free · 3 / month</span>
          </div>
        </div>
      </header>

      <div className="container grid gap-8 py-10 lg:grid-cols-[380px_1fr]">
        {/* LEFT: brief + generator */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {GENERATOR_LIST.map((g) => (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active === g.id ? "bg-accent-gradient text-white shadow-glow" : "glass text-ink-muted hover:text-ink"}`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{generator.label}</h2>
              <button onClick={loadExample} className="text-xs text-accent-cyan hover:underline">Try an example</button>
            </div>
            <p className="mb-5 text-xs text-ink-faint">{generator.description}</p>

            <div className="space-y-4">
              {SHARED.map((f) => (
                <Field key={f.name} label={f.label} required={"required" in f && f.required}>
                  {"textarea" in f && f.textarea ? (
                    <textarea rows={2} value={form[f.name] || ""} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} className={inputCls} />
                  ) : (
                    <input value={form[f.name] || ""} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} className={inputCls} />
                  )}
                </Field>
              ))}
              <Field label="Brand tone" required>
                <select value={form.brand_tone} onChange={(e) => set("brand_tone", e.target.value)} className={inputCls}>
                  {BRAND_TONES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>

              {generator.formFields.map((f) => (
                <Field key={f.name} label={f.label} required={f.required}>
                  {f.type === "select" ? (
                    <select value={form[f.name] || f.options?.[0] || ""} onChange={(e) => set(f.name, e.target.value)} className={inputCls}>
                      {f.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={form[f.name] || ""} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} className={inputCls} />
                  )}
                </Field>
              ))}
            </div>

            <Button onClick={generate} disabled={loading} className="mt-6 w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate</>}
            </Button>
          </div>
        </div>

        {/* RIGHT: output */}
        <div className="min-h-[60vh]">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
          )}
          {!output && !loading && !error && (
            <div className="glass flex h-full min-h-[50vh] flex-col items-center justify-center rounded-2xl text-center text-ink-faint">
              <Sparkles className="mb-3 h-6 w-6 text-accent-cyan" />
              <p className="text-sm">Fill the brief and hit Generate.</p>
              <p className="mt-1 text-xs">Your persona carries across every generator.</p>
            </div>
          )}
          {loading && (
            <div className="glass flex h-full min-h-[50vh] items-center justify-center rounded-2xl">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}
          {output != null && <OutputView data={output} />}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/30";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label} {required && <span className="text-accent-cyan">*</span>}
      </span>
      {children}
    </label>
  );
}

/** Generic, readable renderer for the returned JSON (every field visible + editable-friendly). */
function OutputView({ data }: { data: unknown }) {
  return (
    <div className="space-y-4">
      {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
        <div key={key} className="glass rounded-2xl p-6">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-accent-cyan">{key.replace(/_/g, " ")}</h3>
          <Value value={value} />
        </div>
      ))}
    </div>
  );
}

function Value({ value }: { value: unknown }) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number")
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{String(value)}</p>;
  if (Array.isArray(value))
    return (
      <div className="space-y-3">
        {value.map((v, i) => (
          <div key={i} className="rounded-lg border border-line bg-bg-soft/60 p-3">
            <Value value={v} />
          </div>
        ))}
      </div>
    );
  return (
    <dl className="space-y-2">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k}>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{k.replace(/_/g, " ")}</dt>
          <dd className="mt-0.5"><Value value={v} /></dd>
        </div>
      ))}
    </dl>
  );
}
