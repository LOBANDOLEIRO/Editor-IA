// Templates de vídeo no formato HyperFrames (HTML + GSAP).
// Cada template declara seus campos editáveis em `data-composition-variables`
// no <html>; o editor lê essa lista para montar o formulário, e o script do
// template lê os valores com `window.__hyperframes.getVariables()`.

export type Template = {
  id: string;
  name: string;
  description: string;
  format: string;
  html: string;
};

const GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";

// Lê os valores das variáveis. Usa os defaults declarados como base para o
// template funcionar mesmo se o runtime ainda não tiver carregado.
const READ_VARS = `
      const decl = JSON.parse(document.documentElement.getAttribute("data-composition-variables") || "[]");
      const vars = Object.assign(
        Object.fromEntries(decl.map((d) => [d.id, d.default])),
        (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {}
      );
      const setText = (sel, value) => { document.querySelector(sel).textContent = value || ""; };
      const setImage = (sel, value) => {
        const el = document.querySelector(sel);
        if (value) { el.src = value; } else { el.style.display = "none"; }
      };`;

function attr(json: unknown): string {
  return JSON.stringify(json).replace(/&/g, "&amp;").replace(/'/g, "&#39;");
}

const reelsPromo = `<!doctype html>
<html lang="pt-BR" data-composition-variables='${attr([
  { id: "titulo", type: "string", label: "Título", default: "MEGA PROMOÇÃO" },
  { id: "produto", type: "string", label: "Produto", default: "Tênis Runner Pro" },
  { id: "preco", type: "string", label: "Preço", default: "R$ 199,90" },
  { id: "chamada", type: "string", label: "Chamada para ação", default: "Compre agora • link na bio" },
  { id: "imagem", type: "string", label: "Imagem do produto", default: "", editor: "image" },
  { id: "corFundo", type: "color", label: "Cor de fundo", default: "#1e1b4b" },
  { id: "corDestaque", type: "color", label: "Cor de destaque", default: "#facc15" },
])}'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="${GSAP}"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #fff; }
      #bg { position: absolute; inset: 0; }
      #titulo { position: absolute; top: 220px; left: 80px; right: 80px; text-align: center;
        font-size: 104px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
      #imagem { position: absolute; top: 520px; left: 140px; width: 800px; height: 800px;
        object-fit: contain; }
      #produto { position: absolute; top: 1380px; width: 100%; text-align: center;
        font-size: 64px; font-weight: 600; }
      #preco { position: absolute; top: 1480px; left: 0; right: 0; margin: 0 auto; width: fit-content;
        white-space: nowrap; padding: 20px 56px; border-radius: 28px; font-size: 110px; font-weight: 900; color: #111; }
      #chamada { position: absolute; bottom: 160px; left: 80px; right: 80px; text-align: center;
        font-size: 48px; font-weight: 700; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="8" data-width="1080" data-height="1920">
      <div id="bg" class="clip" data-start="0" data-duration="8" data-track-index="0"></div>
      <h1 id="titulo" class="clip" data-start="0" data-duration="8" data-track-index="1"></h1>
      <img id="imagem" class="clip" data-start="0.6" data-duration="7.4" data-track-index="2" alt="" />
      <h2 id="produto" class="clip" data-start="1.2" data-duration="6.8" data-track-index="3"></h2>
      <div id="preco" class="clip" data-start="1.8" data-duration="6.2" data-track-index="4"></div>
      <p id="chamada" class="clip" data-start="3" data-duration="5" data-track-index="5"></p>
    </div>
    <script>${READ_VARS}
      setText("#titulo", vars.titulo);
      setText("#produto", vars.produto);
      setText("#preco", vars.preco);
      setText("#chamada", vars.chamada);
      setImage("#imagem", vars.imagem);
      document.querySelector("#bg").style.background =
        "radial-gradient(circle at 50% 35%, " + vars.corDestaque + "33, " + vars.corFundo + " 60%)";
      document.querySelector("#titulo").style.color = vars.corDestaque;
      document.querySelector("#preco").style.background = vars.corDestaque;

      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#titulo", { opacity: 0, y: -80, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(2)" }, 0);
      tl.fromTo("#imagem", { opacity: 0, scale: 0.6, rotation: -8 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.8, ease: "power3.out" }, 0.6);
      tl.fromTo("#produto", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5 }, 1.2);
      tl.fromTo("#preco", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(3)" }, 1.8);
      tl.to("#preco", { scale: 1.08, duration: 0.4, yoyo: true, repeat: 5, ease: "sine.inOut" }, 2.6);
      tl.fromTo("#chamada", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, 3);
      tl.to("#imagem", { y: -20, duration: 2.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 3);
      tl.to("#root", { opacity: 0, duration: 0.4 }, 7.6);

      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

const abertura = `<!doctype html>
<html lang="pt-BR" data-composition-variables='${attr([
  { id: "titulo", type: "string", label: "Título", default: "Seu Canal" },
  { id: "subtitulo", type: "string", label: "Subtítulo", default: "Episódio 1 — Começando do zero" },
  { id: "logo", type: "string", label: "Logo (opcional)", default: "", editor: "image" },
  { id: "corFundo", type: "color", label: "Cor de fundo", default: "#0a0a0a" },
  { id: "corDestaque", type: "color", label: "Cor de destaque", default: "#22d3ee" },
])}'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="${GSAP}"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #f4f4f5; }
      #bg { position: absolute; inset: 0; }
      #barra { position: absolute; top: 600px; left: 50%; width: 900px; height: 10px;
        margin-left: -450px; border-radius: 5px; transform-origin: left center; }
      #logo { position: absolute; top: 200px; left: 50%; width: 180px; height: 180px;
        margin-left: -90px; object-fit: contain; }
      #titulo { position: absolute; top: 420px; width: 100%; text-align: center;
        font-size: 150px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
      #subtitulo { position: absolute; top: 660px; width: 100%; text-align: center;
        font-size: 56px; font-weight: 500; opacity: 0.85; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="6" data-width="1920" data-height="1080">
      <div id="bg" class="clip" data-start="0" data-duration="6" data-track-index="0"></div>
      <img id="logo" class="clip" data-start="0.2" data-duration="5.8" data-track-index="1" alt="" />
      <h1 id="titulo" class="clip" data-start="0.4" data-duration="5.6" data-track-index="2"></h1>
      <div id="barra" class="clip" data-start="0.9" data-duration="5.1" data-track-index="3"></div>
      <p id="subtitulo" class="clip" data-start="1.3" data-duration="4.7" data-track-index="4"></p>
    </div>
    <script>${READ_VARS}
      setText("#titulo", vars.titulo);
      setText("#subtitulo", vars.subtitulo);
      setImage("#logo", vars.logo);
      document.querySelector("#bg").style.background = vars.corFundo;
      document.querySelector("#barra").style.background = vars.corDestaque;

      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#logo", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, 0.2);
      tl.fromTo("#titulo", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.4);
      tl.fromTo("#barra", { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 0.9);
      tl.fromTo("#subtitulo", { opacity: 0, y: 30 }, { opacity: 0.85, y: 0, duration: 0.6 }, 1.3);
      tl.to("#titulo", { scale: 1.04, duration: 3, ease: "none" }, 1.1);
      tl.to(["#logo", "#titulo", "#barra", "#subtitulo"], { opacity: 0, y: -30, duration: 0.5, stagger: 0.05 }, 5.2);

      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

const frase = `<!doctype html>
<html lang="pt-BR" data-composition-variables='${attr([
  { id: "frase", type: "string", label: "Frase", default: "A disciplina leva você onde a motivação não alcança." },
  { id: "autor", type: "string", label: "Autor / @perfil", default: "@seuperfil" },
  { id: "fundo", type: "string", label: "Imagem de fundo (opcional)", default: "", editor: "image" },
  { id: "corFundo", type: "color", label: "Cor de fundo", default: "#111827" },
  { id: "corTexto", type: "color", label: "Cor do texto", default: "#f9fafb" },
])}'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1080" />
    <script src="${GSAP}"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden;
        font-family: Georgia, "Times New Roman", serif; }
      #bg { position: absolute; inset: 0; }
      #fundo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.35; }
      #aspas { position: absolute; top: 140px; left: 100px; font-size: 260px; line-height: 1; opacity: 0.25; }
      #frase { position: absolute; top: 300px; left: 120px; right: 120px;
        font-size: 72px; line-height: 1.2; font-style: italic; }
      #autor { position: absolute; bottom: 160px; left: 120px;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 40px; font-weight: 600; opacity: 0.8; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="7" data-width="1080" data-height="1080">
      <div id="bg" class="clip" data-start="0" data-duration="7" data-track-index="0"></div>
      <img id="fundo" class="clip" data-start="0" data-duration="7" data-track-index="1" alt="" />
      <div id="aspas" class="clip" data-start="0.2" data-duration="6.8" data-track-index="2">“</div>
      <p id="frase" class="clip" data-start="0.5" data-duration="6.5" data-track-index="3"></p>
      <p id="autor" class="clip" data-start="2.5" data-duration="4.5" data-track-index="4"></p>
    </div>
    <script>${READ_VARS}
      setText("#autor", vars.autor);
      setImage("#fundo", vars.fundo);
      document.querySelector("#bg").style.background = vars.corFundo;
      document.querySelector("#root").style.color = vars.corTexto;

      // Cada palavra vira um <span> para aparecer uma a uma.
      const fraseEl = document.querySelector("#frase");
      String(vars.frase || "").split(/\\s+/).filter(Boolean).forEach((palavra) => {
        const span = document.createElement("span");
        span.textContent = palavra + " ";
        span.style.display = "inline-block";
        span.style.whiteSpace = "pre";
        fraseEl.appendChild(span);
      });

      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#fundo", { scale: 1.15 }, { scale: 1, duration: 7, ease: "none" }, 0);
      tl.fromTo("#aspas", { opacity: 0, y: 40 }, { opacity: 0.25, y: 0, duration: 0.6 }, 0.2);
      tl.fromTo("#frase span", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12 }, 0.5);
      tl.fromTo("#autor", { opacity: 0, x: -30 }, { opacity: 0.8, x: 0, duration: 0.5 }, 2.5);
      tl.to("#root", { opacity: 0, duration: 0.5 }, 6.5);

      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

export const TEMPLATES: Template[] = [
  {
    id: "reels-promo",
    name: "Promoção para Reels",
    description: "Produto, preço e chamada animados no formato vertical.",
    format: "9:16 • 1080×1920 • 8s",
    html: reelsPromo,
  },
  {
    id: "abertura",
    name: "Abertura de vídeo",
    description: "Título, subtítulo e logo para YouTube ou cursos.",
    format: "16:9 • 1920×1080 • 6s",
    html: abertura,
  },
  {
    id: "frase",
    name: "Frase / Citação",
    description: "Frase aparecendo palavra por palavra para o feed.",
    format: "1:1 • 1080×1080 • 7s",
    html: frase,
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
