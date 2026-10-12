"""Gera a narração: texto -> Piper (voz pt_BR) -> filtro retrô -> public/voz.wav.

Uso: npm run voz -- "Salve família! Eu sou o Lobandoleiro."
Baixe a voz antes (uma vez):
  curl -L -o tools/voices/pt_BR-faber-medium.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx
  curl -L -o tools/voices/pt_BR-faber-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json
"""
import subprocess
import sys

texto = " ".join(sys.argv[1:]) or sys.stdin.read()
subprocess.run(
    [sys.executable, "-m", "piper", "-m", "tools/voices/pt_BR-faber-medium.onnx",
     "--length-scale", "0.95", "-f", "public/raw.wav"],
    input=texto.encode(), check=True,
)
# Voz mais grave e levemente "crocante", tipo jogo antigo.
subprocess.run(
    ["ffmpeg", "-y", "-v", "error", "-i", "public/raw.wav", "-af",
     "asetrate=22050*0.88,aresample=44100,atempo=1.08,bass=g=4,lowpass=f=6000,"
     "acrusher=bits=12:mix=0.3,loudnorm=I=-14", "public/voz.wav"],
    check=True,
)
subprocess.run(["rm", "public/raw.wav"], check=True)
# Pausas entre frases: usadas para sincronizar a caixa de diálogo (src/falas.ts).
subprocess.run(
    "ffmpeg -i public/voz.wav -af silencedetect=n=-35dB:d=0.12 -f null - 2>&1 | grep silence_",
    shell=True,
)
