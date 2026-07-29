"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

const ITEMS = [
  {
    q: "Do I have to write prompts?",
    a: "Never. You fill in a short form about your product; the expert prompts are built in. Claude does the writing behind the scenes.",
  },
  {
    q: "How is this different from using ChatGPT in five tabs?",
    a: "One persona runs consistently through every asset — your Meta ads, Google ads, landing page, and emails all speak to the same customer. No copy-pasting, no drift between channels.",
  },
  {
    q: "Can I edit what it generates?",
    a: "Every field is editable after generation, and you can regenerate any single section. Your edits save to your campaign.",
  },
  {
    q: "What can I actually export?",
    a: "Landing pages export as clean HTML; emails copy to clipboard one click each. More export formats are on the roadmap.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Every row is protected by row-level security — you only ever see your own campaigns.",
  },
  {
    q: "What does the free plan include?",
    a: "Three generations a month, the Campaign Workspace, and fully editable outputs — no card required.",
  },
];

export function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="mx-auto max-w-3xl space-y-3">
      {ITEMS.map((it, i) => (
        <Accordion.Item
          key={i}
          value={`item-${i}`}
          className="glass rounded-xl px-5 data-[state=open]:border-accent/40"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-4 text-left font-medium text-ink">
              {it.q}
              <Plus className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-data-[state=open]:rotate-45 group-data-[state=open]:text-accent" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden text-sm leading-relaxed text-ink-muted data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="pb-5 pr-8">{it.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
