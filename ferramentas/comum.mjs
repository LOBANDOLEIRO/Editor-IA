// Utilitários compartilhados pelos scripts de ferramentas/ (PC e nuvem).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PROJETOS = path.join(RAIZ, "projetos");

export function dirProjeto(nome) {
  if (!nome) falhar("informe o nome do projeto (pasta em projetos/)");
  return path.join(PROJETOS, nome);
}

export function falhar(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

export function rodar(cmd, args, opcoes = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opcoes });
  if (r.status !== 0) falhar(`${cmd} terminou com código ${r.status}`);
}

export function sondar(arquivo) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", arquivo],
    { encoding: "utf8" },
  );
  if (r.status !== 0) falhar(`ffprobe não conseguiu ler ${arquivo}`);
  const info = JSON.parse(r.stdout);
  const v = info.streams.find((s) => s.codec_type === "video");
  if (!v) falhar(`${arquivo} não tem trilha de vídeo`);
  const [n, d] = (v.avg_frame_rate || v.r_frame_rate).split("/").map(Number);
  // Celular grava com rotação em metadado; troca largura/altura quando girado 90°.
  const rot = Math.abs(Number(v.tags?.rotate ?? v.side_data_list?.find((s) => s.rotation != null)?.rotation ?? 0));
  const girado = rot === 90 || rot === 270;
  return {
    largura: girado ? v.height : v.width,
    altura: girado ? v.width : v.height,
    fps: Math.round((n / (d || 1)) * 1000) / 1000,
    duracao: Number(info.format.duration),
    temAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
}

export function lerJson(arquivo, padrao) {
  if (!existsSync(arquivo)) {
    if (padrao !== undefined) return padrao;
    falhar(`arquivo não encontrado: ${arquivo}`);
  }
  return JSON.parse(readFileSync(arquivo, "utf8"));
}

export function gravarJson(arquivo, dados) {
  writeFileSync(arquivo, JSON.stringify(dados, null, 2) + "\n");
}

// fps "bonito" para o ffmpeg (29.97 → 30000/1001).
export function fpsFfmpeg(fps) {
  for (const base of [24, 30, 60]) {
    if (Math.abs(fps - (base * 1000) / 1001) < 0.01) return `${base * 1000}/1001`;
  }
  return String(Math.round(fps));
}
