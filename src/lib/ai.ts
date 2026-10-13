import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Geração e ajuste de composições HyperFrames com a API do Claude.
// Os modelos são configuráveis por variável de ambiente para equilibrar
// custo e qualidade (veja .env.example).

const MODEL_CREATE = process.env.AI_MODEL_CREATE || "claude-opus-5-5";
const MODEL_EDIT = process.env.AI_MODEL_EDIT || MODEL_CREATE;

// Modelos que aceitam o fallback automático do servidor quando um pedido é recusado.
const SUPPORTS_FALLBACK = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);

const SYSTEM_PROMPT = `Você é o motor de criação de vídeos de um editor online. Você escreve composições HyperFrames: um único documento HTML que vira vídeo MP4 (o renderizador abre a página num Chromium headless, avança a animação quadro a quadro e grava com FFmpeg).

Regras obrigatórias do HyperFrames:
1. Responda SOMENTE com o documento HTML completo dentro de um bloco \`\`\`html ... \`\`\`. Nada de explicações.
2. Um elemento raiz <div id="root" data-composition-id="main" data-start="0" data-duration="N" data-width="W" data-height="H">. O <body> e o <html> têm exatamente W×H px, overflow hidden.
3. Todo elemento visual temporizado tem class="clip", data-start (segundos) e data-duration (segundos). data-track-index é opcional.
4. Animação só com GSAP carregado de <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>. Crie UMA timeline pausada: const tl = gsap.timeline({ paused: true }); use posições absolutas (3º argumento), registre com window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl; e termine com tl.seek(0);
5. Lógica 100% determinística: proibido Math.random(), Date.now(), fetch, setTimeout/setInterval, requestAnimationFrame. Nada de vídeos/áudios externos. Não use bibliotecas além do GSAP. Fontes: use fontes do sistema (Inter, ui-sans-serif, system-ui, Georgia).
6. Campos editáveis: declare no <html> o atributo data-composition-variables='[...]' com um array JSON de {"id","type","label","default"} (type: "string", "color" ou "number"; para imagem use type "string" com "editor":"image"). Os textos principais, cores e imagens do vídeo DEVEM ser variáveis. No script, leia os valores assim:
   const decl = JSON.parse(document.documentElement.getAttribute("data-composition-variables") || "[]");
   const vars = Object.assign(Object.fromEntries(decl.map((d) => [d.id, d.default])), (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {});
   e aplique os valores no DOM antes de montar a timeline. Dentro do atributo, escape apóstrofos como &#39;.
7. Imagens do usuário aparecem como endereços "hf-asset://N". Mantenha esses endereços exatamente como estão. Se uma variável de imagem estiver vazia, esconda o elemento.
8. Ao AJUSTAR um vídeo existente: mantenha tudo que o pedido não mudou, preserve as variáveis existentes (ids e valores) e as dimensões, salvo se o pedido pedir o contrário.

Boas práticas de design: textos grandes e legíveis no celular, alto contraste, margens seguras de 8% nas bordas, entradas animadas curtas (0,3–0,8s) com easing (power3.out, back.out), ritmo de uma ideia a cada 1,5–3s, saída suave no final. Textos em português do Brasil, salvo pedido diferente.`;

export type GenerateInput =
  | { mode: "create"; prompt: string; width: number; height: number; duration: number }
  | { mode: "edit"; prompt: string; html: string };

export class AiError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function extractHtml(text: string): string | null {
  const fenced = /```html\s*([\s\S]*?)```/i.exec(text)?.[1];
  const candidate = (fenced ?? text).trim();
  const start = candidate.search(/<!doctype html|<html/i);
  const end = candidate.toLowerCase().lastIndexOf("</html>");
  if (start === -1 || end === -1) return null;
  return candidate.slice(start, end + "</html>".length);
}

export async function generateComposition(input: GenerateInput): Promise<string> {
  const model = input.mode === "create" ? MODEL_CREATE : MODEL_EDIT;
  const userText =
    input.mode === "create"
      ? `Crie um vídeo novo.\nFormato: ${input.width}×${input.height} px, duração de ${input.duration} segundos.\nPedido do usuário:\n${input.prompt}`
      : `Ajuste este vídeo conforme o pedido.\nPedido do usuário:\n${input.prompt}\n\nHTML atual:\n\`\`\`html\n${input.html}\n\`\`\``;

  const stream = getClient().beta.messages.stream({
    model,
    max_tokens: 32000,
    output_config: { effort: input.mode === "create" ? "medium" : "low" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
    ...(SUPPORTS_FALLBACK.has(model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new AiError("A IA recusou este pedido. Tente descrever o vídeo de outra forma.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new AiError("O vídeo ficou grande demais para gerar de uma vez. Tente um pedido mais simples.");
  }

  const text = message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  const html = extractHtml(text);
  if (!html || !html.includes("data-composition-id") || !html.includes("__timelines")) {
    throw new AiError("A IA não devolveu uma composição válida. Tente de novo.");
  }
  return html;
}
