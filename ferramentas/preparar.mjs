#!/usr/bin/env node
// RODA NO PC. Cria o projeto a partir do vídeo bruto (700 MB–1,5 GB+):
// gera um proxy leve (lado menor 720p, mesmo fps) que vai para o GitHub via Git LFS,
// enquanto o original fica só no PC para o render final.
//
//   node ferramentas/preparar.mjs "D:\Videos\bruto.mp4" nome-do-video [--transcrever] [--enviar]
//
//   --transcrever  transcreve no PC (pt) e salva transcript.json no projeto
//   --enviar       faz git add/commit/push do projeto ao final
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { RAIZ, dirProjeto, falhar, rodar, sondar, gravarJson, fpsFfmpeg } from "./comum.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [original, nome] = args.filter((a) => !a.startsWith("--"));
if (!original || !nome) falhar('uso: node ferramentas/preparar.mjs "<video original>" <nome-do-projeto> [--transcrever] [--enviar]');
if (!existsSync(original)) falhar(`vídeo não encontrado: ${original}`);
if (!/^[a-z0-9][a-z0-9-]*$/.test(nome)) falhar("use só letras minúsculas, números e hífen no nome do projeto");

const dir = dirProjeto(nome);
mkdirSync(path.join(dir, "proxy"), { recursive: true });
mkdirSync(path.join(dir, "media"), { recursive: true });

const info = sondar(original);
console.log(`Original: ${info.largura}x${info.altura} · ${info.fps} fps · ${(info.duracao / 60).toFixed(1)} min`);

// Lado menor → 720 px, mantendo proporção; fps constante igual ao original para que
// os tempos (cortes, legendas, motions) batam frame a frame com o render final.
const escala = info.largura >= info.altura ? "scale=-2:'min(720,ih)'" : "scale='min(720,iw)':-2";
const fps = fpsFfmpeg(info.fps);
const proxy = path.join(dir, "proxy", "fonte.mp4");
rodar("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning", "-stats",
  "-i", original,
  "-vf", escala, "-r", fps,
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p",
  "-g", String(Math.round(info.fps)),
  ...(info.temAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : ["-an"]),
  "-movflags", "+faststart",
  proxy,
]);

gravarJson(path.join(dir, "projeto.json"), {
  nome,
  original: path.resolve(original),
  arquivoOriginal: path.basename(original),
  ...info,
  fpsFfmpeg: fps,
  criadoEm: new Date().toISOString(),
});

if (flags.has("--transcrever")) {
  rodar("npx", ["-y", "hyperframes", "transcribe", proxy, "--dir", dir, "--model", "small", "--language", "pt"]);
}

const p = sondar(proxy);
console.log(`\n✓ Proxy criado: projetos/${nome}/proxy/fonte.mp4 (${p.largura}x${p.altura})`);

if (flags.has("--enviar")) {
  const rel = path.relative(RAIZ, dir);
  rodar("git", ["add", rel], { cwd: RAIZ });
  rodar("git", ["commit", "-m", `Projeto ${nome}: proxy para edição na nuvem`], { cwd: RAIZ });
  rodar("git", ["push"], { cwd: RAIZ });
  console.log("✓ Enviado. Na sessão da nuvem é só pedir para editar o projeto.");
} else {
  console.log("Próximo passo: git add projetos/" + nome + " && git commit && git push (ou rode de novo com --enviar)");
}
