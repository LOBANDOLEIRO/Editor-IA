# Fábrica de achadinhos: como rodar no PC (Windows)

```
produtos.csv + roteiros.json + fotos  →  voz  →  cenas com zoom + textos  →  MP4 1080×1920 + TXT  →  Google Drive
```

Cada vídeo leva de 15 a 30 segundos para ficar pronto (sem precisar de GPU). Um lote de 10 sai em poucos minutos.

## 1. Instalar (uma vez só)

Abra o **PowerShell** e rode:

```powershell
winget install Python.Python.3.12
winget install Gyan.FFmpeg
winget install Git.Git
```

Feche e abra o PowerShell de novo, depois rode:

```powershell
cd $HOME\Documents
git clone -b claude/plano-achadinhos https://github.com/lobandoleiro/editor-ia.git
cd editor-ia\achadinhos
pip install -r requirements.txt
```

## 2. Apontar a saída para o Google Drive

Instale o **Google Drive para computador**. Ele cria o drive `G:`. Em `config.json`, troque:

```json
"pasta_saida": "G:/Meu Drive/achadinhos"
```

Os vídeos caem em `G:/Meu Drive/achadinhos/AAAA-MM-DD/`, prontos para o celular (Shopee Vídeo) e para o Metricool.

## 3. Rotina diária

1. Escolha os produtos e preencha `entrada/produtos.csv` e `entrada/midia/<id>/` (veja `ESCOLHER-PRODUTOS.md`).
2. Peça os roteiros ao Claude (`PROMPT-ROTEIRO.md`) e salve em `entrada/roteiros.json`.
3. Confira se está tudo certo:
   ```powershell
   python fabrica.py checar
   ```
   O comando aponta comissão abaixo de 7%, falta de link, de fotos ou de roteiro, e roteiro longo demais.
4. Gere os vídeos:
   ```powershell
   python fabrica.py
   ```
   Vídeos que já existem são pulados. Use `--refazer` para gerar de novo, ou `--so 003` para gerar só um produto.
5. Assista a 2 ou 3 vídeos antes de postar.

## 4. Deixar rodando à noite (opcional)

Agendador de Tarefas → Criar Tarefa Básica → Diariamente, 01:00 → Iniciar programa → `rodar_noite.bat`.
O registro de cada noite fica em `logs/`. Se um produto der erro, o lote continua com os outros.

## Voz

- **`edge`** (padrão): voz neural da Microsoft, grátis, precisa de internet. Vozes: `pt-BR-AntonioNeural` (masculina) e `pt-BR-FranciscaNeural` (feminina). Para mudar, edite `voz_edge` e `velocidade_edge` no `config.json`.
- **`kokoro`**: 100% local (a mesma voz do Pinokio). Instale com `pip install kokoro soundfile` e o [espeak-ng](https://github.com/espeak-ng/espeak-ng/releases), depois use `"motor_voz": "kokoro"` (vozes pt-BR: `pm_alex`, `pm_santa`, `pf_dora`).
- **`teste`**: sem voz (silêncio). Serve só para conferir o visual.

## Música

Coloque MP3s sem direitos autorais em `musica/` (ex.: Biblioteca de Áudio do YouTube). O script escolhe uma por vídeo, em volume baixo. Sem música, o vídeo sai só com a voz.

## Layout do vídeo

- 1ª cena: **gancho** em amarelo, grande, no topo
- Cenas seguintes: selo laranja (`textos_tela`) + legenda da fala embaixo
- Fundo: a própria foto desfocada, com o produto no centro (zoom lento, alternando aproximar e afastar)
- "publicidade" discreto no canto (identificação de publi)

## Próximo passo: API da Shopee

Quando o acesso à API for liberado, o `buscar_produtos.py` vai preencher `produtos.csv` e `entrada/midia/` sozinho (veja `../PLANO-ACHADINHOS.md`). O AppID e a Secret ficam só em `achadinhos/.env`, que já está no `.gitignore`.
