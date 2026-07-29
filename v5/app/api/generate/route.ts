import { NextResponse } from "next/server";
import { z } from "zod";
import { getGenerator } from "@/lib/generators";
import { BRAND_TONES } from "@/lib/generators/types";
import { runGenerator, mapAnthropicError, isGenerationConfigured } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUsage, incrementUsage } from "@/lib/usage";
import { capture } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 60;

const campaignSchema = z.object({
  product_name: z.string().min(1),
  category: z.string().min(1),
  price: z.string().min(1),
  offer: z.string().optional().default(""),
  core_problem: z.string().min(1),
  usp: z.string().min(1),
  target_audience: z.string().optional().default(""),
  brand_tone: z.enum(BRAND_TONES),
});

const bodySchema = z.object({
  pageType: z.string(),
  campaign: campaignSchema,
  extra: z.record(z.string(), z.string()).optional().default({}),
});

export async function POST(req: Request) {
  if (!isGenerationConfigured()) {
    return NextResponse.json(
      { error: "The AI engine isn't connected yet. Add ANTHROPIC_API_KEY to .env.local and restart." },
      { status: 503 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const generator = getGenerator(body.pageType);
  if (!generator) return NextResponse.json({ error: `Unknown generator: ${body.pageType}` }, { status: 400 });

  // Auth + identity (graceful when Supabase not wired)
  const supabase = createClient();
  const userId = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
  const identity = userId ?? req.headers.get("x-forwarded-for") ?? "anon";

  // Rate limit: 5/min/identity (no-op when Upstash not wired)
  if (!(await checkRateLimit(identity))) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  }

  // Usage metering: enforce plan limit BEFORE calling Claude
  const usage = await getUsage(supabase, userId);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "limit_reached", plan: usage.plan, used: usage.used, limit: usage.limit },
      { status: 402 }
    );
  }

  try {
    const { output, tokensUsed } = await runGenerator(generator, body.campaign, body.extra);
    await incrementUsage(supabase, userId);
    await capture(identity, "generation_completed", { pageType: body.pageType, tokensUsed });
    return NextResponse.json({ pageType: body.pageType, output });
  } catch (err) {
    const mapped = mapAnthropicError(err);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
