import { NextResponse } from "next/server";
import { AiError, aiConfigured, generateComposition } from "@/lib/ai";
import { extractAssets, restoreAssets } from "@/lib/assets";
import { addUsage, getAccount, getUsage, remaining } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PROMPT = 2000;
const MAX_HTML = 200_000;

type Body = {
  mode?: "create" | "edit";
  prompt?: string;
  html?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export async function POST(request: Request) {
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "IA desativada: configure ANTHROPIC_API_KEY no servidor (veja o README)." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "Descreva o que você quer." }, { status: 400 });
  if (prompt.length > MAX_PROMPT) {
    return NextResponse.json({ error: `Pedido muito longo (máx. ${MAX_PROMPT} caracteres).` }, { status: 400 });
  }

  const user = await getAccount();
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta para usar a IA.", login: true }, { status: 401 });
  }
  const usage = await getUsage(user);
  if (remaining(user.plan, usage).aiGenerations <= 0) {
    return NextResponse.json(
      { error: `Você usou as ${user.plan.aiGenerationsPerMonth} gerações com IA do plano ${user.plan.name} neste mês.` },
      { status: 402 },
    );
  }

  try {
    let html: string;
    if (body.mode === "edit") {
      const { html: stripped, assets } = extractAssets(String(body.html ?? ""));
      if (!stripped.includes("data-composition-id")) {
        return NextResponse.json({ error: "Nenhum vídeo aberto para ajustar." }, { status: 400 });
      }
      if (stripped.length > MAX_HTML) {
        return NextResponse.json({ error: "Este vídeo é grande demais para ajustar com IA." }, { status: 400 });
      }
      html = restoreAssets(await generateComposition({ mode: "edit", prompt, html: stripped }), assets);
    } else {
      const clamp = (value: unknown, min: number, max: number, fallback: number) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
      };
      html = await generateComposition({
        mode: "create",
        prompt,
        width: clamp(body.width, 320, 3840, 1080),
        height: clamp(body.height, 320, 3840, 1920),
        duration: clamp(body.duration, 2, 60, 8),
      });
    }
    const updated = await addUsage(user, "aiGenerations");
    return NextResponse.json({ html, remaining: remaining(user.plan, updated) });
  } catch (error) {
    if (error instanceof AiError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("Erro na IA:", error);
    return NextResponse.json({ error: "Erro ao falar com a IA. Tente novamente em instantes." }, { status: 502 });
  }
}
