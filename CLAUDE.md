# Editor IA — contexto para continuar o trabalho

Estúdio multitrack no navegador (Next.js 14 + Web Audio), em português. Visão geral e uso: `README.md`.

## Estado atual

- Branch de trabalho: `claude/elegant-faraday-14tby6` (o `main` ainda não tem o estúdio; não há pull request aberto).
- Rodar: `iniciar.bat` (Windows) ou `./iniciar.sh` → http://localhost:3210. Dev: `npm run dev`. Checagem: `npx tsc --noEmit` e `npm run build`.
- Pronto e testado no navegador (Chromium, com áudio sintético): timeline com edição, gravação, mixer, efeitos com chave liga/desliga, presets por gênero, autotune e afinação nota por nota, limpeza de ruído, exportação WAV, layout para celular.

## Ainda não testado de verdade

- Flow Music via useapi.net (geração de beat, stems, letra): depende do `USEAPI_TOKEN` em `.env.local`.
- `iniciar.bat` no Windows e `tailscale serve --bg --https=8443 3210`.
- Voz e microfone reais: alinhamento da gravação (ajuste "Latência"), retorno 🎧, presets, simulação de microfone, segmentação de notas.

## Pendências combinadas com o usuário

- Salvar/abrir projetos (hoje recarregar a página apaga as faixas).
- Afinação nota por nota: dividir/juntar notas, mexer no tempo, desfazer por edição.
- Conversão para a voz do usuário (RVC), autotune em tempo real, seleção de vários clips, automação de volume, escolha do microfone.

## Preferências do usuário

- Nenhum efeito ligado por padrão: tudo é opção de ligar/desligar.
- Usa um headset simples como microfone e grava em sala sem isolamento.
- O PC já tem Tailscale e outro app ("Jarvis") rodando; não ocupar as portas dele.

## Onde fica cada coisa

- `src/lib/audio/` motor (engine, graph = cadeia de efeitos, voiceWorklet = gate/de-esser).
- `src/lib/dsp/` afinação (pitch.ts), limpeza de ruído (denoise.ts); rodam em `src/workers/tune.worker.ts`.
- `src/lib/presets.ts` presets; `src/lib/store.ts` estado; `src/lib/transport.ts` ações.
- `src/app/api/flow/*` rotas do useapi.net; `src/components/` interface.
