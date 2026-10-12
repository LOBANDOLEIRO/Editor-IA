"""Gera trilha chiptune boom-bap e efeitos 8-bit (public/trilha.wav, public/sfx_*.wav)."""
import wave
import numpy as np

SR = 44100


def salvar(nome, x):
    x = np.clip(x, -1, 1)
    with wave.open(nome, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t_(d):
    return np.arange(int(SR * d)) / SR


def quadrada(f, d, duty=0.5):
    t = t_(d)
    return np.where((t * f) % 1 < duty, 1.0, -1.0)


def env(x, a=0.005, r=0.1):
    n = len(x)
    e = np.ones(n)
    na, nr = int(a * SR), min(int(r * SR), n)
    e[:na] = np.linspace(0, 1, na)
    e[n - nr:] *= np.linspace(1, 0, nr)
    return x * e


def nota(n):
    return 440 * 2 ** ((n - 69) / 12)


rng = np.random.default_rng(7)
BPM = 88
beat = 60 / BPM
dur = 23.5
mix = np.zeros(int(SR * dur))


def por(x, seg):
    i = int(seg * SR)
    if i >= len(mix):
        return
    j = min(len(mix), i + len(x))
    mix[i:j] += x[: j - i]


# Bateria boom-bap: bumbo, caixa, chimbal.
for compasso in range(int(dur / (beat * 4)) + 1):
    base = compasso * beat * 4
    for b in [0, 2.5]:
        t = t_(0.25)
        kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-t * 30)) * t) * np.exp(-t * 12)
        por(kick * 0.9, base + b * beat)
    for b in [1, 3]:
        t = t_(0.2)
        snare = rng.uniform(-1, 1, len(t)) * np.exp(-t * 18) * 0.5 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.3
        por(snare, base + b * beat)
    for k in range(8):
        t = t_(0.05)
        hat = rng.uniform(-1, 1, len(t)) * np.exp(-t * 90) * (0.22 if k % 2 else 0.12)
        por(hat, base + k * beat / 2)
    # Baixo quadrado em Lá menor.
    linha = [45, 45, 48, 43] if compasso % 2 == 0 else [41, 41, 43, 40]
    for k, n in enumerate(linha):
        por(env(quadrada(nota(n), beat * 0.9, 0.25) * 0.22, r=0.08), base + k * beat)
    # Melodia curta de pulso a cada 2 compassos.
    if compasso % 2 == 1:
        for k, n in enumerate([69, 72, 76, 74, 72, 69]):
            por(env(quadrada(nota(n), beat * 0.4, 0.125) * 0.07, r=0.1), base + k * beat * 0.5 + beat)

fim = int(SR * (dur - 1.5))
mix[fim:] *= np.linspace(1, 0, len(mix) - fim)
salvar("public/trilha.wav", mix / np.abs(mix).max() * 0.8)


def varredura(f0, f1, d, duty=0.5):
    t = t_(d)
    f = np.linspace(f0, f1, len(t))
    return np.where((np.cumsum(f) / SR) % 1 < duty, 1.0, -1.0)


salvar("public/sfx_pulo.wav", env(varredura(300, 900, 0.15, 0.25) * 0.35, r=0.05))
salvar("public/sfx_bloco.wav", env(varredura(180, 90, 0.12) * 0.4, r=0.05))
salvar("public/sfx_poder.wav", np.concatenate([env(quadrada(nota(n), 0.07, 0.25) * 0.35, r=0.02) for n in [60, 64, 67, 72, 76, 79, 84]]))
salvar("public/sfx_pop.wav", env(varredura(600, 1400, 0.09, 0.5) * 0.3, r=0.04))
salvar("public/sfx_passo.wav", env(np.random.default_rng(1).uniform(-1, 1, int(SR * 0.04)) * 0.15, r=0.03))
