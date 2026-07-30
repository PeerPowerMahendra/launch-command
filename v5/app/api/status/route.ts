import { NextResponse } from "next/server";
import { generationMode } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ mode: generationMode() });
}
