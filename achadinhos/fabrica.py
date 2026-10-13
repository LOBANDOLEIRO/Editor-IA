"""Fábrica de vídeos de achadinhos: roteiro -> voz -> clipes -> montagem.

Uso (na pasta achadinhos/):
    python fabrica.py checar          # confere produtos.csv, roteiros e mídias
    python fabrica.py                 # gera todos os vídeos que faltam
    python fabrica.py --so 003        # gera só um produto
    python fabrica.py --refazer       # gera de novo mesmo se já existir
    python fabrica.py --voz teste     # sem voz real (silêncio), para testar

Entradas:
    entrada/produtos.csv     uma linha por produto
    entrada/roteiros.json    lista de roteiros (campo "id" igual ao do CSV)
    entrada/midia/<id>/      fotos (.jpg .png .webp) e vídeos (.mp4) do anúncio
    musica/                  mp3 sem direitos autorais (opcional)

Saída:
    <pasta_saida>/<data>/<id>-<nicho>.mp4  e  .txt (legenda + hashtags + link)
"""

import argparse
import asyncio
import csv
import datetime as dt
import json
import random
import shutil
import subprocess
import sys
import textwrap
import traceback
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30
# Área do produto na tela: abaixo do texto de cima, acima da legenda.
CAIXA_Y, CAIXA_W, CAIXA_H = 400, 1040, 1060
PAUSA = 0.15  # segundos de respiro depois de cada fala
EXT_FOTO = {".jpg", ".jpeg", ".png", ".webp"}
EXT_VIDEO = {".mp4", ".mov", ".webm"}
COMISSAO_MIN = 7.0

FONTES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]


def carregar_config():
    cfg = json.loads((RAIZ / "config.json").read_text(encoding="utf-8"))
    cfg["pasta_saida"] = Path(cfg.get("pasta_saida") or RAIZ / "saida")
    if not cfg["pasta_saida"].is_absolute():
        cfg["pasta_saida"] = RAIZ / cfg["pasta_saida"]
    return cfg


def log(msg, arquivo=None):
    linha = f"[{dt.datetime.now():%H:%M:%S}] {msg}"
    print(linha, flush=True)
    if arquivo:
        with open(arquivo, "a", encoding="utf-8") as f:
            f.write(linha + "\n")


def rodar(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg falhou:\n{' '.join(map(str, cmd))}\n{r.stderr[-1500:]}")
    return r.stdout


def duracao(arquivo):
    out = rodar(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", str(arquivo)])
    return float(out.strip())


# ---------------------------------------------------------------- entradas

def ler_produtos():
    with open(RAIZ / "entrada" / "produtos.csv", encoding="utf-8-sig", newline="") as f:
        return [{k.strip(): (v or "").strip() for k, v in linha.items()}
                for linha in csv.DictReader(f) if (linha.get("id") or "").strip()]


def ler_roteiros():
    roteiros = {}
    arq = RAIZ / "entrada" / "roteiros.json"
    if arq.exists():
        for r in json.loads(arq.read_text(encoding="utf-8")):
            roteiros[str(r["id"]).strip()] = r
    # Roteiro avulso em trabalho/<id>/roteiro.json tem prioridade.
    for avulso in (RAIZ / "trabalho").glob("*/roteiro.json"):
        r = json.loads(avulso.read_text(encoding="utf-8"))
        roteiros[avulso.parent.name] = r
    return roteiros


def midias(pid):
    pasta = RAIZ / "entrada" / "midia" / pid
    if not pasta.is_dir():
        return []
    return sorted(p for p in pasta.iterdir() if p.suffix.lower() in EXT_FOTO | EXT_VIDEO)


def falas_do_roteiro(r):
    return [r["gancho"]] + list(r.get("falas", []))


def checar(produtos, roteiros):
    problemas = 0
    for p in produtos:
        pid, avisos = p["id"], []
        try:
            if float(p.get("comissao", "0").replace(",", ".").rstrip("%")) < COMISSAO_MIN:
                avisos.append(f"comissão {p.get('comissao')}% abaixo de {COMISSAO_MIN:g}%")
        except ValueError:
            avisos.append("coluna comissao vazia ou inválida")
        if not p.get("link_afiliado", "").startswith("http"):
            avisos.append("sem link_afiliado")
        if not midias(pid):
            avisos.append(f"sem fotos em entrada/midia/{pid}/")
        r = roteiros.get(pid)
        if not r:
            avisos.append("sem roteiro")
        else:
            palavras = sum(len(f.split()) for f in falas_do_roteiro(r))
            seg = palavras / 2.8  # ~2,8 palavras/s com voz acelerada
            if not 12 <= seg <= 25:
                avisos.append(f"roteiro com ~{seg:.0f}s (alvo 15-20s)")
        status = "OK" if not avisos else "; ".join(avisos)
        problemas += bool(avisos)
        print(f"{pid:>5} {p.get('nicho', ''):<6} {p.get('nome', '')[:34]:<34} {status}")
    print(f"\n{len(produtos)} produtos, {problemas} com pendência.")


# ---------------------------------------------------------------- voz

def gerar_voz(texto, destino, cfg, motor):
    if motor == "teste":
        seg = max(1.2, len(texto.split()) / 2.8)
        rodar(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
               "-t", f"{seg:.2f}", str(destino)])
    elif motor == "edge":
        import edge_tts
        com = edge_tts.Communicate(texto, cfg["voz_edge"], rate=cfg.get("velocidade_edge", "+10%"))
        asyncio.run(com.save(str(destino)))
    elif motor == "kokoro":
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
        if "_kokoro" not in cfg:
            cfg["_kokoro"] = KPipeline(lang_code="p")  # p = português do Brasil
        partes = [a for _, _, a in cfg["_kokoro"](texto, voice=cfg["voz_kokoro"],
                                                   speed=cfg.get("velocidade_kokoro", 1.1))]
        sf.write(str(destino), np.concatenate(partes), 24000)
    else:
        raise ValueError(f"motor de voz desconhecido: {motor}")


# ---------------------------------------------------------------- textos na tela

_fontes = {}


def fonte(tamanho, cfg):
    if tamanho not in _fontes:
        candidatas = [cfg.get("fonte")] + FONTES
        for c in candidatas:
            if c and Path(c).exists():
                _fontes[tamanho] = ImageFont.truetype(c, tamanho)
                break
        else:
            _fontes[tamanho] = ImageFont.load_default(size=tamanho)
    return _fontes[tamanho]


def texto_centrado(d, y, linhas, f, preenchimento, contorno=None, caixa=None):
    """Desenha linhas centralizadas a partir de y; devolve o y final."""
    alturas = [d.textbbox((0, 0), l, font=f)[3] for l in linhas]
    alt_linha = max(alturas) + 14
    if caixa:
        larg = max(d.textlength(l, font=f) for l in linhas)
        d.rounded_rectangle([(W - larg) / 2 - 36, y - 22, (W + larg) / 2 + 36,
                             y + alt_linha * len(linhas) + 8], radius=28, fill=caixa)
    for l in linhas:
        larg = d.textlength(l, font=f)
        d.text(((W - larg) / 2, y), l, font=f, fill=preenchimento,
               stroke_width=8 if contorno else 0, stroke_fill=contorno)
        y += alt_linha
    return y


def criar_overlay(destino, topo, legenda, eh_gancho, cfg):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if topo:
        if eh_gancho:  # gancho: grande, amarelo, ocupa o topo
            texto_centrado(d, 90, textwrap.wrap(topo.upper(), 18), fonte(78, cfg),
                           "#FFE600", contorno="black")
        else:  # preço/benefício: selo laranja Shopee
            texto_centrado(d, 150, textwrap.wrap(topo, 16), fonte(96, cfg),
                           "white", caixa="#EE4D2D")
    if legenda:
        texto_centrado(d, 1530, textwrap.wrap(legenda, 24), fonte(62, cfg),
                       "white", contorno="black")
    d.text((W - 230, 30), "publicidade", font=fonte(32, cfg), fill=(255, 255, 255, 170))
    img.save(destino)


# ---------------------------------------------------------------- clipes

def tamanho_encaixado(larg, alt):
    esc = min(CAIXA_W / larg, CAIXA_H / alt)
    return int(larg * esc) // 2 * 2, int(alt * esc) // 2 * 2


def montar_segmento(midia, overlay, audio, destino, dur, indice):
    frames = int(dur * FPS) + 1
    fundo = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
             f"gblur=sigma=40,eq=brightness=-0.12")
    if midia.suffix.lower() in EXT_FOTO:
        with Image.open(midia) as im:
            fw, fh = tamanho_encaixado(*im.size)
        # Zoom lento, alternando aproximar/afastar para variar entre cenas.
        if indice % 2 == 0:
            z = "min(zoom+0.0012,1.12)"
        else:
            z = "if(eq(on,0),1.12,max(zoom-0.0012,1.0))"
        entrada = ["-i", str(midia)]
        frente = (f"scale={fw * 2}:{fh * 2},zoompan=z='{z}':d={frames}:"
                  f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={fw}x{fh}:fps={FPS}")
        fundo += f",loop=loop={frames}:size=1:start=0,fps={FPS}"
    else:
        entrada = ["-stream_loop", "-1", "-i", str(midia)]
        frente = (f"fps={FPS},scale={CAIXA_W}:{CAIXA_H}:force_original_aspect_ratio=decrease,"
                  f"scale=trunc(iw/2)*2:trunc(ih/2)*2")
        fundo += f",fps={FPS}"
    filtro = (f"[0:v]split[a][b];[a]{fundo}[bg];[b]{frente}[fg];"
              f"[bg][fg]overlay=(W-w)/2:{CAIXA_Y}+({CAIXA_H}-h)/2[v1];"
              f"[v1][1:v]overlay=0:0,format=yuv420p[v];[2:a]apad[aud]")
    rodar(["ffmpeg", "-y", *entrada, "-loop", "1", "-i", str(overlay), "-i", str(audio),
           "-filter_complex", filtro, "-map", "[v]", "-map", "[aud]", "-t", f"{dur:.3f}",
           "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
           "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", str(destino)])


# ---------------------------------------------------------------- produto completo

def gerar_video(p, r, cfg, motor, pasta_dia, arq_log):
    pid = p["id"]
    trab = RAIZ / "trabalho" / pid
    if trab.exists():
        for velho in trab.iterdir():
            if velho.name != "roteiro.json":
                velho.unlink()
    trab.mkdir(parents=True, exist_ok=True)
    fotos = midias(pid)
    if not fotos:
        raise RuntimeError(f"sem mídia em entrada/midia/{pid}/")

    falas = falas_do_roteiro(r)
    telas = list(r.get("textos_tela", []))
    segmentos = []
    for i, fala in enumerate(falas):
        voz = trab / f"fala{i:02d}.{'wav' if motor == 'kokoro' else 'mp3'}"
        gerar_voz(fala, voz, cfg, motor)
        dur = duracao(voz) + PAUSA
        # Gancho no topo durante a 1ª fala; depois, um texto de tela por fala.
        topo = r["gancho"] if i == 0 else (telas[i - 1] if i - 1 < len(telas) else "")
        overlay = trab / f"tela{i:02d}.png"
        criar_overlay(overlay, topo, "" if i == 0 else fala, i == 0, cfg)
        seg = trab / f"seg{i:02d}.mp4"
        montar_segmento(fotos[i % len(fotos)], overlay, voz, seg, dur, i)
        segmentos.append(seg)

    lista = trab / "lista.txt"
    lista.write_text("".join(f"file '{s.name}'\n" for s in segmentos), encoding="utf-8")
    junto = trab / "junto.mp4"
    rodar(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lista), "-c", "copy", str(junto)])

    nome = f"{pid}-{p.get('nicho') or 'geral'}"
    final = pasta_dia / f"{nome}.mp4"
    musicas = sorted((RAIZ / "musica").glob("*.mp3"))
    if musicas:
        vol = cfg.get("volume_musica", 0.12)
        rodar(["ffmpeg", "-y", "-i", str(junto), "-stream_loop", "-1", "-i", str(random.choice(musicas)),
               "-filter_complex",
               f"[1:a]volume={vol}[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]",
               "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
               "-shortest", str(final)])
    else:
        shutil.copy(junto, final)

    total = duracao(final)
    hashtags = " ".join(r.get("hashtags", []))
    texto = (f"{r.get('legenda', '').strip()}\n\n{hashtags}\n\n"
             f"Produto: {p.get('nome', '')} | R$ {p.get('preco', '')}\n"
             f"Link (afiliado): {p.get('link_afiliado', '')}\n")
    (pasta_dia / f"{nome}.txt").write_text(texto, encoding="utf-8")
    aviso = "" if 12 <= total <= 25 else "  << fora do alvo de 15-20s"
    log(f"{pid}: OK, {total:.1f}s -> {final}{aviso}", arq_log)


def main():
    ap = argparse.ArgumentParser(description="Fábrica de vídeos de achadinhos")
    ap.add_argument("acao", nargs="?", default="gerar", choices=["gerar", "checar"])
    ap.add_argument("--so", help="gerar só este id")
    ap.add_argument("--refazer", action="store_true", help="refazer vídeos que já existem")
    ap.add_argument("--voz", help="motor de voz: edge, kokoro ou teste (padrão: config.json)")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg não encontrado. Instale (winget install Gyan.FFmpeg) e abra um novo terminal.")
    cfg = carregar_config()
    produtos, roteiros = ler_produtos(), ler_roteiros()
    if args.acao == "checar":
        checar(produtos, roteiros)
        return

    motor = args.voz or cfg.get("motor_voz", "edge")
    hoje = f"{dt.date.today():%Y-%m-%d}"
    pasta_dia = cfg["pasta_saida"] / hoje
    pasta_dia.mkdir(parents=True, exist_ok=True)
    (RAIZ / "logs").mkdir(exist_ok=True)
    arq_log = RAIZ / "logs" / f"{hoje}.log"

    ok = falhas = pulados = 0
    for p in produtos:
        pid = p["id"]
        if args.so and pid != args.so:
            continue
        if not args.refazer and list(cfg["pasta_saida"].glob(f"*/{pid}-*.mp4")):
            pulados += 1
            continue
        if pid not in roteiros:
            log(f"{pid}: sem roteiro, pulando", arq_log)
            pulados += 1
            continue
        try:
            gerar_video(p, roteiros[pid], cfg, motor, pasta_dia, arq_log)
            ok += 1
        except Exception as e:  # um produto com erro não para o lote
            falhas += 1
            log(f"{pid}: ERRO {e}", arq_log)
            with open(arq_log, "a", encoding="utf-8") as f:
                traceback.print_exc(file=f)
    log(f"Fim: {ok} gerados, {falhas} com erro, {pulados} pulados. Pasta: {pasta_dia}", arq_log)


if __name__ == "__main__":
    main()
