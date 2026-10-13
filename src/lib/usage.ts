import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { getPlan, type Plan } from "./plans";
import { authEnabled } from "./supabase/config";
import { createClient } from "./supabase/server";

// Conta do usuário e controle de uso por mês.
// - Com Supabase configurado: login obrigatório para IA e render; plano e uso
//   ficam no banco (tabelas `profiles` e `usage`).
// - Sem Supabase (modo local): usuário anônimo por cookie, plano de
//   DEFAULT_PLAN e uso num arquivo JSON. Serve só para desenvolvimento.

export type Usage = { videos: number; aiGenerations: number };
export type Account = { id: string; email: string | null; plan: Plan; mode: "supabase" | "local" };

const LOCAL_COOKIE = "eia_uid";
const STORE_FILE = process.env.USAGE_FILE || path.join(process.cwd(), ".data", "usage.json");

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Conta logada, ou `null` quando o login está ligado e ninguém entrou. */
export async function getAccount(): Promise<Account | null> {
  if (authEnabled) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", data.user.id).maybeSingle();
    return { id: data.user.id, email: data.user.email ?? null, plan: getPlan(profile?.plan), mode: "supabase" };
  }

  const jar = await cookies();
  let id = jar.get(LOCAL_COOKIE)?.value;
  if (!id) {
    id = randomUUID();
    jar.set(LOCAL_COOKIE, id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return { id, email: null, plan: getPlan(process.env.DEFAULT_PLAN), mode: "local" };
}

export async function getUsage(account: Account): Promise<Usage> {
  if (account.mode === "supabase") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("usage")
      .select("videos, ai_generations")
      .eq("user_id", account.id)
      .eq("month", currentMonth())
      .maybeSingle();
    return { videos: data?.videos ?? 0, aiGenerations: data?.ai_generations ?? 0 };
  }
  const store = await loadLocalStore();
  return store[`${account.id}:${currentMonth()}`] ?? { videos: 0, aiGenerations: 0 };
}

export async function addUsage(account: Account, field: keyof Usage): Promise<Usage> {
  if (account.mode === "supabase") {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("increment_usage", {
      kind: field === "videos" ? "videos" : "ai_generations",
    });
    if (error) throw error;
    return { videos: data?.videos ?? 0, aiGenerations: data?.ai_generations ?? 0 };
  }
  return addLocalUsage(account.id, field);
}

export function remaining(plan: Plan, usage: Usage) {
  return {
    videos: Math.max(0, plan.videosPerMonth - usage.videos),
    aiGenerations: Math.max(0, plan.aiGenerationsPerMonth - usage.aiGenerations),
  };
}

// Modo local ---------------------------------------------------------------

type Store = Record<string, Usage>;
let queue: Promise<unknown> = Promise.resolve();

async function loadLocalStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(STORE_FILE, "utf8")) as Store;
  } catch {
    return {};
  }
}

function addLocalUsage(userId: string, field: keyof Usage): Promise<Usage> {
  // Fila simples para duas requisições simultâneas não sobrescreverem o arquivo.
  const run = queue.then(async () => {
    const store = await loadLocalStore();
    const key = `${userId}:${currentMonth()}`;
    const usage = store[key] ?? { videos: 0, aiGenerations: 0 };
    usage[field] += 1;
    store[key] = usage;
    await mkdir(path.dirname(STORE_FILE), { recursive: true });
    await writeFile(STORE_FILE, JSON.stringify(store));
    return usage;
  });
  queue = run.catch(() => undefined);
  return run;
}
