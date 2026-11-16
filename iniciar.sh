#!/usr/bin/env bash
# Inicia o Editor IA neste computador (Mac/Linux).
# Uso: ./iniciar.sh [porta]      (porta padrão: 3210)
set -e
cd "$(dirname "$0")"
PORT="${1:-3210}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão 18 ou mais nova: https://nodejs.org"
  exit 1
fi
if ! node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)'; then
  echo "O Node.js instalado é antigo ($(node -v)). Instale a versão 18 ou mais nova: https://nodejs.org"
  exit 1
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Criei o arquivo .env.local. Abra-o e preencha USEAPI_TOKEN para gerar beats com o Flow Music."
  echo "(Sem o token o estúdio funciona, mas só com o beat demo.)"
fi

echo "Instalando dependências…"
npm install --no-audit --no-fund
echo "Preparando o estúdio…"
npm run build

echo
echo "Editor IA pronto: http://localhost:$PORT"
echo "Para parar: Ctrl+C"
echo
exec npx next start -p "$PORT"
