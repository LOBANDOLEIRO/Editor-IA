import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai";
import { currentUser, getUsage, remaining } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  const usage = await getUsage(user.id);
  return NextResponse.json({
    plan: user.plan,
    usage,
    remaining: remaining(user.plan, usage),
    aiEnabled: aiConfigured(),
  });
}
