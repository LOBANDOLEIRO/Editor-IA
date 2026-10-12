"""Trilha noir: drone grave, boom-bap lento, chiado de vinil e efeitos (whoosh, impacto)."""
import wave
import numpy as np

SR = 44100
rng = np.random.default_rng(3)


def salvar(nome, x):
    x = np.clip(x, -1, 1)
    with wave.open(nome, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def lowpass(x, a):
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


dur = 23.5
t = np.arange(int(SR * dur)) / SR
mix = np.zeros_like(t)

# Drone em Lá menor com tremolo lento.
for f, a in [(55, 0.35), (110, 0.18), (130.81, 0.1), (164.81, 0.08)]:
    mix += a * np.sin(2 * np.pi * f * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.15 * t + f))

# Boom-bap lento (80 BPM).
beat = 60 / 80


def por(x, seg):
    i = int(seg * SR)
    if i >= len(mix):
        return
    j = min(len(mix), i + len(x))
    mix[i:j] += x[: j - i]


k = 0
while k * beat < dur:
    tt = np.arange(int(SR * 0.35)) / SR
    if k % 4 in (0, 2) or k % 8 == 7:
        por(np.sin(2 * np.pi * (45 + 70 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 9) * 0.8, k * beat)
    if k % 4 in (1, 3):
        n = rng.uniform(-1, 1, len(tt))
        por(lowpass(n, 0.35) * np.exp(-tt * 14) * 0.45, k * beat)
    k += 1

# Chiado de vinil.
crackle = np.zeros_like(t)
idx = rng.integers(0, len(t), 900)
crackle[idx] = rng.uniform(-0.5, 0.5, len(idx))
mix += crackle + rng.normal(0, 0.006, len(t))

mix[: int(SR * 0.8)] *= np.linspace(0, 1, int(SR * 0.8))
mix[-int(SR * 1.5):] *= np.linspace(1, 0, int(SR * 1.5))
salvar("public/noir_trilha.wav", mix / np.abs(mix).max() * 0.8)

# Whoosh: ruído com filtro abrindo e fechando.
d = 0.6
tt = np.arange(int(SR * d)) / SR
env = np.sin(np.pi * tt / d) ** 2
w = np.zeros_like(tt)
acc = 0.0
n = rng.uniform(-1, 1, len(tt))
for i in range(len(tt)):
    a = 0.02 + 0.5 * env[i]
    acc += a * (n[i] - acc)
    w[i] = acc
salvar("public/noir_whoosh.wav", w * env / np.abs(w).max() * 0.7)

# Impacto: bumbo grave longo + ruído.
d = 1.6
tt = np.arange(int(SR * d)) / SR
imp = np.sin(2 * np.pi * (35 + 80 * np.exp(-tt * 12)) * tt) * np.exp(-tt * 2.5)
imp += lowpass(rng.uniform(-1, 1, len(tt)), 0.2) * np.exp(-tt * 6) * 0.6
salvar("public/noir_impacto.wav", imp / np.abs(imp).max() * 0.9)
