import { NextResponse } from "next/server";
import { accountEmail, flowRequest, readJson } from "@/lib/flow/server";

export const runtime = "nodejs";

/** Inicia a geração (modo async). O cliente acompanha via /api/flow/job?id=... */
export async function POST(req: Request) {
  const body = await readJson(req);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ error: "Descreva o beat (prompt vazio)." }, { status: 400 });

  const payload: Record<string, unknown> = {
    prompt: prompt.slice(0, 10_000),
    instrumental: body?.instrumental !== false,
    model: body?.model === "lyria-3-pro" ? "lyria-3-pro" : "lyria-3.5",
    mode: "async",
  };
  if (typeof body?.lyrics === "string" && body.lyrics.trim()) {
    payload.lyrics = body.lyrics.slice(0, 10_000);
    payload.instrumental = false;
  }
  const email = accountEmail();
  if (email) payload.email = email;

  return flowRequest("/music", { method: "POST", body: payload });
}
