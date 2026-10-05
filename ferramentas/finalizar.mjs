#!/usr/bin/env node
// RODA NO PC. Render final em alta a partir do vídeo ORIGINAL, reaproveitando
// tudo que foi decidido na nuvem (cortes, cor, legendas, motions, b-rolls, trilha).
//
//   git pull
//   node ferramentas/finalizar.mjs <nome> [--4k] [--original "D:\novo\caminho.mp4"]
//
// Saída: projetos/<nome>/renders/final.mp4
import { existsSync } from "node:fs";
import path from "node:path";
import { RAIZ, dirProjeto, falhar, lerJson, rodar } from "./comum.mjs";

const args = process.argv.slice(2);
const nome = args.find((a) => !a.startsWith("--"));
const iOrig = args.indexOf("--original");
const caminhoOriginal = iOrig >= 0 ? args[iOrig + 1] : undefined;
const dir = dirProjeto(nome);
const projeto = lerJson(path.join(dir, "projeto.json"));
if (!existsSync(path.join(dir, "index.html"))) falhar("projeto ainda não tem composição (index.html)");

const node = process.execPath;
rodar(node, [path.join(RAIZ, "ferramentas", "fonte.mjs"), nome, "original", ...(caminhoOriginal ? [caminhoOriginal] : [])]);
rodar(node, [path.join(RAIZ, "ferramentas", "cortar.mjs"), nome, "--final"]);

// Passos extras que geram mídia derivada do vídeo (ex.: recorte do rosto para legenda
// atrás da pessoa) ficam em projeto.json → "derivados": [["npx","hyperframes",...], ...]
for (const passo of projeto.derivados ?? []) rodar(passo[0], passo.slice(1), { cwd: dir });

const vertical = projeto.altura > projeto.largura;
const resolucao = args.includes("--4k") ? (vertical ? "portrait-4k" : "landscape-4k") : vertical ? "portrait" : "landscape";
rodar("npx", ["-y", "hyperframes", "render", "-q", "delivery", "--resolution", resolucao, "-o", "renders/final.mp4"], { cwd: dir });
console.log(`\n✓ Pronto: projetos/${nome}/renders/final.mp4`);
