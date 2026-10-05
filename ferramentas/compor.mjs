#!/usr/bin/env node
// Cria a composição HyperFrames dentro de um projeto que já tem proxy/cortes
// (o `hyperframes init` recusa pastas não vazias). O index.html inicial já toca
// media/cortado.mp4 em tela cheia; legendas, motions e b-rolls entram por cima.
//
//   node ferramentas/compor.mjs <nome> [--forcar]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PROJETOS, RAIZ, dirProjeto, falhar, lerJson, gravarJson, rodar, sondar } from "./comum.mjs";

const args = process.argv.slice(2);
const nome = args.find((a) => !a.startsWith("--"));
const dir = dirProjeto(nome);
const projeto = lerJson(path.join(dir, "projeto.json"));
if (existsSync(path.join(dir, "index.html")) && !args.includes("--forcar")) {
  falhar("projeto já tem index.html (use --forcar para recriar do zero)");
}
const cortado = path.join(dir, "media", "cortado.mp4");
if (!existsSync(cortado)) falhar(`media/cortado.mp4 não existe — rode: node ferramentas/cortar.mjs ${nome}`);

const vertical = projeto.altura > projeto.largura;
const [W, H] = vertical ? [1080, 1920] : [1920, 1080];
const tmp = path.join(PROJETOS, `.tmp-${nome}`);
rmSync(tmp, { recursive: true, force: true });
const r = spawnSync(
  "npx",
  ["-y", "hyperframes", "init", path.basename(tmp), "--non-interactive", "--resolution", vertical ? "portrait" : "landscape"],
  { cwd: PROJETOS, stdio: "inherit", env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" }, shell: process.platform === "win32" },
);
if (r.status !== 0) falhar("hyperframes init falhou");
for (const f of readdirSync(tmp)) {
  if (f === "index.html") continue; // escrito abaixo
  const destino = path.join(dir, f);
  if (!existsSync(destino) || args.includes("--forcar")) renameSync(path.join(tmp, f), destino);
}
rmSync(tmp, { recursive: true, force: true });

const pkg = lerJson(path.join(dir, "package.json"));
gravarJson(path.join(dir, "package.json"), { ...pkg, name: nome });
gravarJson(path.join(dir, "meta.json"), { id: nome, name: nome, createdAt: new Date().toISOString() });

const dur = Math.round(sondar(cortado).duracao * 1000) / 1000;
writeFileSync(
  path.join(dir, "index.html"),
  `<!doctype html>
<html lang="pt-BR" data-resolution="${vertical ? "portrait" : "landscape"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; }
      #fonte { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="${W}" data-height="${H}">
      <!-- Vídeo já cortado (proxy na nuvem, original no PC). Não troque o src. -->
      <video id="fonte" class="clip" src="media/cortado.mp4" data-has-audio="true" data-start="0" data-duration="${dur}" data-track-index="0"></video>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`,
);

rodar(process.execPath, [path.join(RAIZ, "ferramentas", "vendorizar-cdn.mjs"), nome]);
console.log(`✓ Composição criada em projetos/${nome}/index.html (${W}x${H}, ${dur}s)`);
