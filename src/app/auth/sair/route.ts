import { authEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (authEnabled) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  // Caminho relativo: atrás de proxy a origem vista pelo servidor pode ser outra.
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
