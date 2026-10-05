#!/usr/bin/env node
// Aplica cortes.json em media/fonte.mp4 → media/cortado.mp4.
// Os cortes são DADOS (tempos em segundos do vídeo bruto), não um arquivo já cortado:
// a nuvem aplica no proxy para editar/pré-visualizar e o PC reaplica os mesmos tempos
// no original no render final. As composições HyperFrames usam media/cortado.mp4.
//
//   node ferramentas/cortar.mjs <nome> [--final]
//
// cortes.json:
// {
//   "trechos": [ { "inicio": 1.20, "fim": 8.75 }, { "inicio": 10.1, "fim": 22.4 } ],
//   "cor": "eq=contrast=1.06:saturation=1.12",   // opcional: filtro ffmpeg de cor
//   "lut": "luts/quente.cube"                     // opcional: caminho relativo ao projeto
// }
// Sem cortes.json, o vídeo inteiro é usado (só normaliza fps).
import { existsSync } from "node:fs";
import path from "node:path";
import { dirProjeto, falhar, lerJson, rodar, sondar } from "./comum.mjs";

const args = process.argv.slice(2);
const final = args.includes("--final");
const [nome] = args.filter((a) => !a.startsWith("--"));
const dir = dirProjeto(nome);
const projeto = lerJson(path.join(dir, "projeto.json"));
const fonte = path.join(dir, "media", "fonte.mp4");
if (!existsSync(fonte)) falhar(`media/fonte.mp4 não existe — rode: node ferramentas/fonte.mjs ${nome} proxy|original`);

const info = sondar(fonte);
const cortes = lerJson(path.join(dir, "cortes.json"), {});
const trechos = cortes.trechos?.length ? cortes.trechos : [{ inicio: 0, fim: info.duracao }];
for (const [i, t] of trechos.entries()) {
  if (!(t.fim > t.inicio)) falhar(`trecho ${i}: fim (${t.fim}) deve ser maior que início (${t.inicio})`);
  if (t.fim > info.duracao + 0.05) falhar(`trecho ${i}: fim ${t.fim}s passa da duração (${info.duracao.toFixed(2)}s)`);
}

const fps = projeto.fpsFfmpeg || String(Math.round(info.fps));
const cor = [cortes.cor, cortes.lut && `lut3d='${path.join(dir, cortes.lut).replace(/\\/g, "/").replace(/:/g, "\\:")}'`]
  .filter(Boolean)
  .join(",");
const FADE = 0.012; // micro-fade no áudio em cada corte para não estalar

const partes = [];
const entradasConcat = [];
trechos.forEach((t, i) => {
  const dur = t.fim - t.inicio;
  partes.push(`[0:v]trim=start=${t.inicio}:end=${t.fim},setpts=PTS-STARTPTS[v${i}]`);
  if (info.temAudio) {
    partes.push(
      `[0:a]atrim=start=${t.inicio}:end=${t.fim},asetpts=PTS-STARTPTS,` +
        `afade=t=in:d=${FADE},afade=t=out:st=${Math.max(0, dur - FADE)}:d=${FADE}[a${i}]`,
    );
  }
  entradasConcat.push(info.temAudio ? `[v${i}][a${i}]` : `[v${i}]`);
});
const a = info.temAudio ? 1 : 0;
partes.push(`${entradasConcat.join("")}concat=n=${trechos.length}:v=1:a=${a}[vc]${a ? "[ao]" : ""}`);
partes.push(`[vc]fps=${fps}${cor ? "," + cor : ""},format=yuv420p[vo]`);

const saida = path.join(dir, "media", "cortado.mp4");
rodar("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning", "-stats",
  "-i", fonte,
  "-filter_complex", partes.join(";"),
  "-map", "[vo]", ...(a ? ["-map", "[ao]"] : []),
  "-c:v", "libx264",
  ...(final ? ["-preset", "slow", "-crf", "14"] : ["-preset", "veryfast", "-crf", "23"]),
  "-g", String(Math.round(info.fps)),
  ...(a ? ["-c:a", "aac", "-b:a", final ? "320k" : "160k"] : []),
  "-movflags", "+faststart",
  saida,
]);

const total = trechos.reduce((s, t) => s + (t.fim - t.inicio), 0);
console.log(`✓ media/cortado.mp4 · ${trechos.length} trecho(s) · ${total.toFixed(2)}s (bruto: ${info.duracao.toFixed(2)}s)`);
