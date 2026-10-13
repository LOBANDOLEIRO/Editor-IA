"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Login sem senha em dois passos: e-mail → código de 6 dígitos.
// O código é digitado no mesmo aparelho, então funciona mesmo quando o app de
// e-mail do celular abre os links em outro navegador.

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Muitas tentativas. Espere um minuto e tente de novo." : "Não foi possível enviar o código. Confira o e-mail.");
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError("Código inválido ou expirado.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const input =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base outline-none focus:border-cyan-400";
  const button = "w-full rounded-lg bg-cyan-400 py-2.5 font-semibold text-zinc-900 disabled:opacity-50";

  return (
    <div className="mt-5">
      {error ? <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
          <button type="submit" disabled={busy} className={button}>
            {busy ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-sm text-zinc-300">
            Enviamos um código para <strong>{email}</strong>. Digite abaixo ou toque no link do e-mail.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            pattern="[0-9]{6,10}"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${input} text-center text-2xl tracking-[0.4em]`}
          />
          <button type="submit" disabled={busy} className={button}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
            className="w-full text-sm text-zinc-400 hover:text-white"
          >
            Usar outro e-mail
          </button>
        </form>
      )}
    </div>
  );
}
