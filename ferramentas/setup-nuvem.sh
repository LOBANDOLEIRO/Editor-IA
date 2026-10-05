#!/usr/bin/env bash
# Prepara o container da nuvem a cada sessão (chamado pelo hook SessionStart).
# No PC não faz nada: lá o HyperFrames já está instalado.
set -uo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

RAIZ="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
LOG=/tmp/setup-nuvem.log
cd "$RAIZ"
export HYPERFRAMES_SKIP_SKILLS=1   # skills já estão versionadas em .claude/skills

{
  echo "== $(date) setup-nuvem"
  git lfs install --local >/dev/null 2>&1
  git lfs pull 2>&1 | tail -2

  # Chrome headless que o HyperFrames usa para renderizar (~115 MB, vem de storage.googleapis.com)
  npx -y hyperframes browser ensure 2>&1 | tail -3

  # Lyria (trilha sonora via Gemini) — só é usada se GEMINI_API_KEY estiver configurada
  pip3 install -q google-genai 2>&1 | grep -v "^WARNING" | tail -2
} >>"$LOG" 2>&1

# whisper.cpp (transcrição/legendas) demora ~3 min para compilar: roda em segundo plano.
if ! command -v whisper-cli >/dev/null 2>&1; then
  (
    W=/tmp/whisper.cpp
    [ -d "$W" ] || git clone -q --depth 1 https://github.com/ggml-org/whisper.cpp "$W"
    cmake -S "$W" -B "$W/build" -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF >/dev/null &&
      cmake --build "$W/build" -j"$(nproc)" --config Release >/dev/null &&
      cmake --install "$W/build" --prefix /usr/local >/dev/null && ldconfig &&
      echo "== whisper-cli instalado"
  ) >>"$LOG" 2>&1 &
fi

# Deixa o proxy de cada projeto pronto em media/fonte.mp4
for p in projetos/*/proxy/fonte.mp4; do
  [ -f "$p" ] || continue
  nome=$(basename "$(dirname "$(dirname "$p")")")
  [ -e "projetos/$nome/media/fonte.mp4" ] || node ferramentas/fonte.mjs "$nome" proxy >>"$LOG" 2>&1
done

echo "Ambiente de edição pronto (log: $LOG)."
exit 0
