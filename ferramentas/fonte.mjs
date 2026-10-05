#!/usr/bin/env node
// Escolhe qual vídeo fica em projetos/<nome>/media/fonte.mp4 — o arquivo que o resto
// do pipeline usa. Na nuvem é o proxy; no PC, para o render final, é o original.
//
//   node ferramentas/fonte.mjs <nome> proxy
//   node ferramentas/fonte.mjs <nome> original ["D:\caminho\se\mudou.mp4"]
import { copyFileSync, existsSync, linkSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { dirProjeto, falhar, lerJson } from "./comum.mjs";

const [nome, modo = "proxy", caminho] = process.argv.slice(2);
const dir = dirProjeto(nome);
const projeto = lerJson(path.join(dir, "projeto.json"));

let origem;
if (modo === "proxy") origem = path.join(dir, "proxy", "fonte.mp4");
else if (modo === "original") origem = caminho || projeto.original;
else falhar('modo deve ser "proxy" ou "original"');

if (!existsSync(origem)) {
  falhar(
    modo === "proxy"
      ? `proxy não encontrado (${origem}). Rode "git lfs pull" ou crie o projeto com preparar.mjs no PC.`
      : `original não encontrado em ${origem}. Passe o caminho atual como 3º argumento.`,
  );
}

mkdirSync(path.join(dir, "media"), { recursive: true });
const destino = path.join(dir, "media", "fonte.mp4");
rmSync(destino, { force: true });
try {
  linkSync(origem, destino); // hardlink: instantâneo e sem ocupar espaço extra
} catch {
  console.log("(hardlink indisponível, copiando — pode demorar com arquivos grandes)");
  copyFileSync(origem, destino);
}
console.log(`✓ media/fonte.mp4 ← ${modo} (${origem})`);
