import { NextResponse } from "next/server";
import { accountEmail, flowRequest, readJson } from "@/lib/flow/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await readJson(req);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ error: "Descreva o tema da letra." }, { status: 400 });
  const payload: Record<string, unknown> = { prompt: prompt.slice(0, 2000) };
  if (typeof body?.structure === "string" && body.structure.trim()) {
    payload.structure = body.structure.slice(0, 2000);
  }
  const email = accountEmail();
  if (email) payload.email = email;
  return flowRequest("/music/lyrics", { method: "POST", body: payload, timeout: 110_000 });
}
