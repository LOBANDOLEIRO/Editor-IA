"""Episódio 1 (teste): narração provisória com Piper + trilha samba/funk sincronizada.

Gera public/desenho/voz.wav, public/desenho/trilha.wav e src/desenho/tempos.ts.
Troque a voz pela sua (gravação ou Suno) mantendo a mesma ordem das falas.
"""
import subprocess
import sys
import wave
import numpy as np

SR = 22050
FALAS = [
    # (cena, quem, texto, pausa_antes)
    (1, "loba", "Salve, família! Eu sou o Lobandoleiro.", 0.6),
    (1, "loba", "E esse toca-discos aqui não toca só música... ele toca o tempo.", 0.3),
    (2, "loba", "Segura firme! A gente vai voltar pros anos oitenta. Capão Redondo, zona sul de São Paulo.", 1.4),
    (3, "loba", "Antes do rap, antes dos Racionais, tinha um moleque chamado Pedro Paulo. O Paulinho.", 1.6),
    (3, "loba", "E o Paulinho tocava repinique na roda de samba.", 0.4),
    (4, "loba", "Só que a batida dele era diferente. Tinha o suingue do funk americano.", 1.2),
    (4, "loba", "O moleque era fã de James Brown.", 0.5),
    (5, "amigo", "Aí, Paulinho... Paulinho Brown!", 1.3),
    (5, "loba", "E foi assim que nasceu o apelido. Anos depois, o mundo ia conhecer esse moleque como... Mano Brown.", 0.6),
    (6, "loba", "Essa foi do Lado B. Se inscreve, que a próxima viagem já tá marcada!", 1.6),
]


def tts(texto, saida, escala):
    subprocess.run(
        [sys.executable, "-m", "piper", "-m", "tools/voices/pt_BR-faber-medium.onnx",
         "--length-scale", str(escala), "-f", saida],
        input=texto.encode(), check=True, capture_output=True,
    )
    with wave.open(saida) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def grave(x, fator):
    # Muda o tom reamostrando (fator < 1 = mais grave e mais lento).
    idx = np.arange(0, len(x), fator)
    return np.interp(idx, np.arange(len(x)), x)


partes, tempos, t = [], [], 0.0
for cena, quem, texto, pausa in FALAS:
    x = tts(texto, "/tmp/fala.wav", 0.95 if quem == "loba" else 0.85)
    x = grave(x, 0.9) if quem == "loba" else grave(x, 1.12)
    partes.append(np.zeros(int(pausa * SR)))
    t += pausa
    tempos.append((cena, quem, texto, round(t, 2), round(t + len(x) / SR, 2)))
    partes.append(x)
    t += len(x) / SR
partes.append(np.zeros(int(2.0 * SR)))
voz = np.concatenate(partes)
voz = voz / np.abs(voz).max() * 0.9
total = len(voz) / SR


def salvar(nome, x, sr):
    with wave.open(nome, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


salvar("public/desenho/voz.wav", voz, SR)

# Início de cada cena = início da 1ª fala da cena menos a pausa.
inicio = {}
for (cena, _, _, s, _), (_, _, _, pausa) in zip(tempos, FALAS):
    inicio.setdefault(cena, max(0.0, round(s - pausa, 2)))
cenas = [inicio[c] for c in sorted(inicio)] + [round(total, 2)]

with open("src/desenho/tempos.ts", "w") as f:
    f.write("// Gerado por tools/desenho_audio.py: não edite à mão.\n")
    f.write(f"export const DURACAO = {round(total, 2)};\n")
    f.write(f"export const CENAS = {cenas};\n")
    f.write("export const FALAS = [\n")
    for cena, quem, texto, s, e in tempos:
        f.write(f"\t{{cena: {cena}, quem: '{quem}', texto: {texto!r}, de: {s}, ate: {e}}},\n")
    f.write("] as const;\n")
print("duração", total, "cenas", cenas)

# ---------------------------------------------------------------- trilha
SR2 = 44100
rng = np.random.default_rng(5)
mix = np.zeros(int(total * SR2))


def por(x, seg, ganho=1.0):
    i = int(seg * SR2)
    if i >= len(mix) or i < 0:
        return
    j = min(len(mix), i + len(x))
    mix[i:j] += x[: j - i] * ganho


def tt(d):
    return np.arange(int(d * SR2)) / SR2


def surdo(seg, g=1.0):
    t = tt(0.5)
    por(np.sin(2 * np.pi * (60 + 30 * np.exp(-t * 20)) * t) * np.exp(-t * 6), seg, g)


def caixa(seg, g=0.4, d=0.12, cor=8000):
    t = tt(d)
    n = rng.uniform(-1, 1, len(t))
    por(n * np.exp(-t * 40) * 0.6 + np.sin(2 * np.pi * 330 * t) * np.exp(-t * 35) * 0.3, seg, g)


def pandeiro(seg, g=0.18):
    t = tt(0.06)
    por(rng.uniform(-1, 1, len(t)) * np.exp(-t * 70), seg, g)


def repinique(seg, g=0.5):
    t = tt(0.15)
    por(np.sin(2 * np.pi * 520 * t) * np.exp(-t * 28) + rng.uniform(-0.3, 0.3, len(t)) * np.exp(-t * 60), seg, g)


def baixo(seg, f, d, g=0.25):
    t = tt(d)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * f * t)
    por(x * np.exp(-t * 3) * np.minimum(1, (d - t) * 20), seg, g)


def metais(seg, notas, d=0.18, g=0.12):
    t = tt(d)
    x = sum(np.sign(np.sin(2 * np.pi * 440 * 2 ** ((n - 69) / 12) * t)) for n in notas)
    por(x * np.exp(-t * 6), seg, g)


c1, c2, c3, c4, c5, c6, fim = cenas
# Cena 1: groove de herói (funk grave).
b = 60 / 96
k = c1
while k < c2 - 0.1:
    surdo(k, 0.8); caixa(k + b, 0.35); surdo(k + b * 2.5, 0.6); caixa(k + b * 3, 0.35)
    for i, f in enumerate([55, 55, 65.4, 73.4]):
        baixo(k + i * b, f, b * 0.9)
    k += b * 4
# Cena 2: subida (viagem no tempo).
t2 = tt(c3 - c2)
sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(80, 1200, len(t2))) / SR2)
por(sweep * np.linspace(0, 0.25, len(t2)), c2)
por(rng.uniform(-1, 1, len(t2)) * np.linspace(0, 0.15, len(t2)), c2)
# Cenas 3 e 5: samba (surdo marcando, pandeiro, repinique).
b = 60 / 104


def samba(a, z, funk=False):
    k = a
    while k < z - 0.1:
        surdo(k + b, 0.9)
        surdo(k, 0.45)
        for i in range(8):
            pandeiro(k + i * b / 4 * 2, 0.15 if i % 2 else 0.25)
        if funk:
            # Batida quebrada estilo James Brown no repinique + metais.
            for s in [0, 0.75, 1.5, 2.25, 2.75, 3.5]:
                repinique(k + s * b / 2, 0.55)
            metais(k + 1.5 * b / 2, [62, 66, 69])
            baixo(k, 73.4, b * 0.4); baixo(k + b * 0.75, 73.4, b * 0.3); baixo(k + b * 1.5, 87.3, b * 0.4)
        else:
            for s in [0, 1, 1.5, 3]:
                repinique(k + s * b / 2, 0.35)
        k += b * 2


samba(c3, c4)
samba(c4, c5, funk=True)
samba(c5, c6, funk=True)
# Cena 6: fanfarra final.
for i, n in enumerate([[62, 66, 69], [64, 67, 71], [66, 69, 74]]):
    metais(c6 + 0.2 + i * 0.25, n, 0.3 if i < 2 else 1.2, 0.14)
surdo(c6 + 0.2, 1)
mix[-int(SR2 * 1.5):] *= np.linspace(1, 0, int(SR2 * 1.5))
salvar("public/desenho/trilha.wav", mix / np.abs(mix).max() * 0.85, SR2)
