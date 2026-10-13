// O login só liga quando o Supabase está configurado. Sem ele, o app roda em
// modo local (usuário anônimo por cookie), útil para testar sem conta.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
