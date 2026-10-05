#!/usr/bin/env node
// A rede da nuvem bloqueia cdn.jsdelivr.net, de onde as composições HyperFrames
// carregam GSAP e outras bibliotecas. Este script baixa cada
// https://cdn.jsdelivr.net/npm/<pacote>@<versão>/<arquivo> pelo npm (liberado),
// salva em <projeto>/vendor/ e troca a URL no HTML. O render fica igual no PC.
//
//   node ferramentas/vendorizar-cdn.mjs <nome>
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { dirProjeto } from "./comum.mjs";

const dir = dirProjeto(process.argv[2]);
const URL_CDN = /https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/@]+\/)?[^/@]+)@([^/"'\s]+)\/([^"'\s)]+)/g;

function htmls(d) {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return ["node_modules", "vendor", "renders", "media", "proxy"].includes(e.name) ? [] : htmls(p);
    return e.name.endsWith(".html") ? [p] : [];
  });
}

const tmp = mkdtempSync(path.join(os.tmpdir(), "vendor-"));
const baixados = new Map();
function local(pacote, versao, arquivo) {
  const chave = `${pacote}@${versao}`;
  if (!baixados.has(chave)) {
    const destino = path.join(tmp, chave.replace("/", "__"));
    mkdirSync(destino, { recursive: true });
    const tgz = execFileSync("npm", ["pack", chave, "--silent", "--pack-destination", destino], {
      encoding: "utf8",
      shell: process.platform === "win32",
    }).trim().split("\n").pop();
    execFileSync("tar", ["xzf", path.join(destino, tgz), "-C", destino]);
    baixados.set(chave, path.join(destino, "package"));
  }
  const origem = path.join(baixados.get(chave), arquivo);
  if (!existsSync(origem)) throw new Error(`${chave} não tem ${arquivo}`);
  const rel = path.posix.join("vendor", chave, arquivo);
  mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  cpSync(origem, path.join(dir, rel));
  return rel;
}

let total = 0;
for (const html of htmls(dir)) {
  const texto = readFileSync(html, "utf8");
  const relRaiz = path.relative(path.dirname(html), dir).split(path.sep).join("/");
  const novo = texto.replace(URL_CDN, (url, pacote, versao, arquivo) => {
    const rel = local(pacote, versao, arquivo);
    total++;
    console.log(`  ${url} → ${rel}`);
    return relRaiz ? `${relRaiz}/${rel}` : rel;
  });
  if (novo !== texto) writeFileSync(html, novo);
}
rmSync(tmp, { recursive: true, force: true });
console.log(total ? `✓ ${total} referência(s) trocadas por cópias locais` : "✓ nenhuma URL do jsdelivr encontrada");
