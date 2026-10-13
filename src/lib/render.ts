import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Renderiza uma composição para MP4 com a CLI oficial do HyperFrames
// (Chromium headless + FFmpeg). Precisa de um servidor com FFmpeg
// instalado; não funciona em hospedagem serverless como a Vercel.

const CLI = path.join(process.cwd(), "node_modules", "hyperframes", "bin", "hyperframes.mjs");
const TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 5 * 60 * 1000);

export class RenderError extends Error {}

// Um render por vez para não derrubar um servidor pequeno.
let queue: Promise<unknown> = Promise.resolve();

const WATERMARK = `<div style="position:fixed;right:3%;bottom:3%;z-index:2147483647;padding:10px 18px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font:600 28px Inter,ui-sans-serif,system-ui,sans-serif;">Feito com Editor IA</div>`;

export function addWatermark(html: string): string {
  const index = html.toLowerCase().lastIndexOf("</body>");
  return index === -1 ? html + WATERMARK : html.slice(0, index) + WATERMARK + html.slice(index);
}

function runCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env: {
        ...process.env,
        HYPERFRAMES_NO_TELEMETRY: "1",
        HYPERFRAMES_NO_UPDATE_CHECK: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const keep = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-8000);
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(output);
      else reject(new RenderError(`Falha ao renderizar (código ${code}).\n${output.slice(-1500)}`));
    });
  });
}

export async function renderToMp4(html: string): Promise<Buffer> {
  const run = queue.then(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "editor-ia-"));
    try {
      await writeFile(path.join(dir, "index.html"), html);
      const output = path.join(dir, "video.mp4");
      await runCli(["render", dir, "-o", output, "-q", process.env.RENDER_QUALITY || "standard", "-f", "30"]);
      return await readFile(output);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  queue = run.catch(() => undefined);
  return run;
}
