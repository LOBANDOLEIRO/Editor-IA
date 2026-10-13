import { NextResponse } from "next/server";
import { addWatermark, renderToMp4 } from "@/lib/render";
import { addUsage, currentUser, getUsage, remaining } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_HTML = 15_000_000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { html?: string };
  const html = String(body.html ?? "");
  if (!html.includes("data-composition-id")) {
    return NextResponse.json({ error: "Nenhum vídeo para renderizar." }, { status: 400 });
  }
  if (html.length > MAX_HTML) {
    return NextResponse.json({ error: "Vídeo grande demais (use imagens menores)." }, { status: 413 });
  }

  const user = await currentUser();
  const usage = await getUsage(user.id);
  if (remaining(user.plan, usage).videos <= 0) {
    return NextResponse.json(
      { error: `Você usou os ${user.plan.videosPerMonth} vídeos do plano ${user.plan.name} neste mês.` },
      { status: 402 },
    );
  }

  try {
    const mp4 = await renderToMp4(user.plan.watermark ? addWatermark(html) : html);
    await addUsage(user.id, "videos");
    return new Response(new Uint8Array(mp4), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="video.mp4"',
      },
    });
  } catch (error) {
    console.error("Erro no render:", error);
    return NextResponse.json(
      { error: "Não foi possível renderizar no servidor. Baixe o HTML e renderize no computador (veja o README)." },
      { status: 500 },
    );
  }
}
