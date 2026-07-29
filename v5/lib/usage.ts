import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, type Plan } from "./plans";

export interface UsageState {
  plan: Plan;
  used: number;
  limit: number | null; // null = unlimited
  allowed: boolean;
}

/**
 * Reads the caller's plan + monthly usage and decides whether a generation
 * is allowed. Enforced BEFORE calling Claude. When Supabase is not wired,
 * returns an allow with plan "free" so local dev works.
 */
export async function getUsage(
  supabase: SupabaseClient | null,
  userId: string | null
): Promise<UsageState> {
  if (!supabase || !userId) {
    return { plan: "free", used: 0, limit: PLANS.free.monthlyGenerations, allowed: true };
  }
  const { data } = await supabase
    .from("profiles")
    .select("plan, generations_used_this_month")
    .eq("id", userId)
    .single();

  const plan = (data?.plan as Plan) ?? "free";
  const used = data?.generations_used_this_month ?? 0;
  const limit = PLANS[plan].monthlyGenerations;
  const allowed = limit === null || used < limit;
  return { plan, used, limit, allowed };
}

export async function incrementUsage(
  supabase: SupabaseClient | null,
  userId: string | null
): Promise<void> {
  if (!supabase || !userId) return;
  // atomic increment via RPC defined in the migration
  await supabase.rpc("increment_generations", { p_user_id: userId });
}
