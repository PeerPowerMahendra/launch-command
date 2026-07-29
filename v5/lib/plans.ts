export type Plan = "free" | "pro" | "agency";

export interface PlanDef {
  id: Plan;
  name: string;
  price: number; // monthly USD
  monthlyGenerations: number | null; // null = unlimited
  blurb: string;
  features: string[];
  highlight?: boolean;
  /** Set once Stripe is wired (Phase 4). */
  stripePriceId?: string;
}

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    monthlyGenerations: 3,
    blurb: "Kick the tyres. No card required.",
    features: ["3 generations / month", "Campaign Workspace", "Editable outputs", "1 saved campaign"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29,
    monthlyGenerations: null,
    blurb: "For founders shipping campaigns every week.",
    features: [
      "Unlimited generations",
      "All three generators",
      "Landing page HTML export",
      "Kanban launch board",
      "Unlimited saved campaigns",
    ],
    highlight: true,
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: 79,
    monthlyGenerations: null,
    blurb: "For teams running many brands at once.",
    features: ["Everything in Pro", "Multi-brand workspaces", "Team seats", "Priority generation queue"],
  },
};

export const PLAN_LIST = Object.values(PLANS);
