@echo off
rem Inicia o Editor IA neste computador (Windows).
rem Uso: de dois cliques, ou rode "iniciar.bat 3210" para escolher a porta.
cd /d "%~dp0"
set "PORTA=%~1"
if "%PORTA%"=="" set "PORTA=3210"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao 18 ou mais nova: https://nodejs.org
  pause
  exit /b 1
)
node -e "process.exit(+process.versions.node.split('.')[0] >= 18 ? 0 : 1)"
if errorlevel 1 (
  echo O Node.js instalado e antigo. Instale a versao 18 ou mais nova: https://nodejs.org
  pause
  exit /b 1
)

if not exist .env.local (
  copy .env.example .env.local >nul
  echo Criei o arquivo .env.local. Abra-o no Bloco de Notas e preencha USEAPI_TOKEN
  echo para gerar beats com o Flow Music. Sem o token, so o beat demo funciona.
  echo.
)

echo Instalando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 goto erro
echo Preparando o estudio...
call npm run build
if errorlevel 1 goto erro

echo.
echo Editor IA pronto: http://localhost:%PORTA%
echo Para parar: feche esta janela ou aperte Ctrl+C
echo.
call npx next start -p %PORTA%
goto :eof

:erro
echo.
echo Algo falhou acima. Copie a mensagem de erro e mande para o Claude.
pause
exit /b 1
