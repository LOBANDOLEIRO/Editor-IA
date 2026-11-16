import { NextResponse } from "next/server";
import { flowRequest } from "@/lib/flow/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !id.startsWith("job:")) {
    return NextResponse.json({ error: "jobid inválido" }, { status: 400 });
  }
  return flowRequest(`/jobs/${encodeURIComponent(id)}`);
}
