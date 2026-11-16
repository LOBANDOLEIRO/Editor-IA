import { NextResponse } from "next/server";

/**
 * Cliente server-side para a Flow Music API do useapi.net (não oficial, não afiliada ao Google).
 * Docs: https://useapi.net/docs/api-flowmusic-v1
 * O token nunca sai do servidor.
 */
const BASE = "https://api.useapi.net/v1/flowmusic";

export function isConfigured() {
  return Boolean(process.env.USEAPI_TOKEN?.trim());
}

export function accountEmail(): string | undefined {
  return process.env.FLOWMUSIC_EMAIL?.trim() || undefined;
}

type FlowInit = {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  /** ms */
  timeout?: number;
};

export async function flowRequest(path: string, init: FlowInit = {}) {
  const token = process.env.USEAPI_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "USEAPI_TOKEN não configurado no servidor (.env.local)." },
      { status: 503 },
    );
  }

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeout ?? 60_000);
  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text.slice(0, 500) || `HTTP ${res.status}` };
    }
    // 596 (erro de conta) não é um status HTTP padrão para o navegador; mapeia para 502.
    const status = res.status >= 200 && res.status <= 599 && res.status !== 596 ? res.status : 502;
    return NextResponse.json(data, { status });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "Tempo esgotado falando com o useapi.net" : `Falha de rede: ${String(err)}` },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
