import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { TEMPLATES } from "@/lib/templates";

const STEPS = [
  { title: "Escolha um modelo ou descreva", text: "Comece de um template pronto ou peça para a IA: “vídeo de promoção do meu tênis por R$199”." },
  { title: "Edite pelo celular", text: "Troque textos, cores e imagens e veja a prévia na hora, sem instalar nada." },
  { title: "Baixe o MP4", text: "Renderize em alta qualidade e poste no Reels, TikTok, YouTube ou WhatsApp." },
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-lg font-bold">
          Editor<span className="text-cyan-400">IA</span>
        </span>
        <Link href="/editor" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900">
          Abrir editor
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center sm:pt-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Vídeos profissionais em minutos, <span className="text-cyan-400">do seu celular</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
          Templates animados e uma IA que monta o vídeo para você. Edite textos, cores e imagens e baixe em MP4.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/editor" className="w-full rounded-full bg-cyan-400 px-6 py-3 font-semibold text-zinc-900 sm:w-auto">
            Criar meu vídeo grátis
          </Link>
          <a href="#planos" className="w-full rounded-full border border-zinc-700 px-6 py-3 font-semibold sm:w-auto">
            Ver planos
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 font-bold text-cyan-400">
              {i + 1}
            </div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{step.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-bold">Modelos prontos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Link
              key={t.id}
              href={`/editor?template=${t.id}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-cyan-400"
            >
              <p className="text-xs uppercase tracking-wide text-cyan-400">{t.format}</p>
              <h3 className="mt-2 font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-zinc-400">{t.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-2 text-2xl font-bold">Planos</h2>
        <p className="mb-6 text-sm text-zinc-400">Assinatura em breve. Por enquanto, teste grátis.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 ${plan.id === "criador" ? "border-cyan-400 bg-cyan-400/5" : "border-zinc-800 bg-zinc-900/60"}`}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-extrabold">{plan.priceLabel}</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {plan.highlights.map((h) => (
                  <li key={h}>✓ {h}</li>
                ))}
              </ul>
              {plan.id === "gratis" ? (
                <Link href="/editor" className="mt-6 block rounded-full bg-white py-2 text-center text-sm font-semibold text-zinc-900">
                  Começar grátis
                </Link>
              ) : (
                <span className="mt-6 block rounded-full border border-zinc-700 py-2 text-center text-sm text-zinc-400">
                  Em breve
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-500">
        Vídeos gerados com HyperFrames (open source, Apache 2.0).
      </footer>
    </main>
  );
}
