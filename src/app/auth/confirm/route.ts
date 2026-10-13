import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Link do e-mail de login: valida o token e abre a sessão.
// Funciona mesmo se o e-mail for aberto em outro navegador ou aparelho.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return redirectTo(next);
  }
  return redirectTo("/entrar?erro=link");
}

// Redireciono com caminho relativo: atrás de proxy (Vercel, Nginx) a origem
// vista pelo servidor pode não ser o domínio do site.
function redirectTo(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}
