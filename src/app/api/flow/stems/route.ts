import { NextResponse } from "next/server";
import { flowRequest, readJson } from "@/lib/flow/server";

export const runtime = "nodejs";
// A separação é síncrona no useapi (até ~2 min).
export const maxDuration = 150;

export async function POST(req: Request) {
  const body = await readJson(req);
  const clip = typeof body?.clip === "string" ? body.clip : "";
  if (!clip.includes("-clip:")) return NextResponse.json({ error: "clip inválido" }, { status: 400 });
  return flowRequest("/music/edit", {
    method: "POST",
    body: { operation: "stems", clip },
    timeout: 140_000,
  });
}
