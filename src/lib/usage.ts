import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { getPlan, type Plan } from "./plans";

// Controle de uso por mês, guardado num arquivo JSON.
// Provisório: enquanto não há login/pagamento, o usuário é identificado por
// um cookie anônimo e o plano vem de DEFAULT_PLAN. Quando entrar o login
// (ex.: Supabase), troque `currentUser()` e o armazenamento por uma tabela.

export type Usage = { videos: number; aiGenerations: number };
type Store = Record<string, Usage>;

const USER_COOKIE = "eia_uid";
const STORE_FILE = process.env.USAGE_FILE || path.join(process.cwd(), ".data", "usage.json");

let queue: Promise<unknown> = Promise.resolve();

function monthKey(userId: string): string {
  return `${userId}:${new Date().toISOString().slice(0, 7)}`;
}

async function loadStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(STORE_FILE, "utf8")) as Store;
  } catch {
    return {};
  }
}

async function saveStore(store: Store): Promise<void> {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store));
}

export async function currentUser(): Promise<{ id: string; plan: Plan }> {
  const jar = await cookies();
  let id = jar.get(USER_COOKIE)?.value;
  if (!id) {
    id = randomUUID();
    jar.set(USER_COOKIE, id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return { id, plan: getPlan(process.env.DEFAULT_PLAN) };
}

export async function getUsage(userId: string): Promise<Usage> {
  const store = await loadStore();
  return store[monthKey(userId)] ?? { videos: 0, aiGenerations: 0 };
}

export async function addUsage(userId: string, field: keyof Usage): Promise<Usage> {
  // Fila simples para duas requisições simultâneas não sobrescreverem o arquivo.
  const run = queue.then(async () => {
    const store = await loadStore();
    const key = monthKey(userId);
    const usage = store[key] ?? { videos: 0, aiGenerations: 0 };
    usage[field] += 1;
    store[key] = usage;
    await saveStore(store);
    return usage;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function remaining(plan: Plan, usage: Usage) {
  return {
    videos: Math.max(0, plan.videosPerMonth - usage.videos),
    aiGenerations: Math.max(0, plan.aiGenerationsPerMonth - usage.aiGenerations),
  };
}
