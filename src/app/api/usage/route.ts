import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai";
import { authEnabled } from "@/lib/supabase/config";
import { getAccount, getUsage, remaining } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getAccount();
  const base = { authEnabled, aiEnabled: aiConfigured() };
  if (!account) return NextResponse.json({ ...base, loggedIn: false });

  const usage = await getUsage(account);
  return NextResponse.json({
    ...base,
    loggedIn: true,
    email: account.email,
    plan: account.plan,
    usage,
    remaining: remaining(account.plan, usage),
  });
}
