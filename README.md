# Editor IA

Criador de thumbnails para YouTube, Instagram, Reels, Shorts e TikTok, direto no navegador.

- **Camadas**: fundo (cor, degradê ou foto), fotos, textos, setas, círculos, caixas e disco de vinil. Arraste para mover e puxe a bolinha do canto para redimensionar.
- **Textos de thumbnail**: fontes como Anton, Bebas Neue e Luckiest Guy, contorno, degradê, faixa de destaque e sombra.
- **Contorno de adesivo** em fotos PNG sem fundo.
- **6 modelos prontos**: Análise de álbum, Reação, Top 10, Antes x Depois, Dinheiro e Tutorial.
- **4 formatos**: YouTube 1280×720, quadrado 1080×1080, retrato 1080×1350 e vertical 1080×1920.
- **Prévia no celular em tamanho real**, com a marca de duração do vídeo por cima, como no YouTube.
- **Checklist "Pronta para publicar?"**: quantidade de palavras, letras pequenas demais, texto embaixo da duração e limite de 2 MB do YouTube.
- **Fórmulas de texto que dão clique** e, quando aberto pelo claude.ai, ideias de texto geradas por IA.
- **Calculadora "Ganhar dinheiro"** para vender thumbnails como serviço.
- Desfazer/refazer (Ctrl+Z / Ctrl+Shift+Z), duplicar (Ctrl+D), apagar (Delete), mover com as setas, colar imagem com Ctrl+V.
- O projeto fica salvo no navegador automaticamente.

## Rodar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Publicar na internet de graça

1. Entre em [vercel.com](https://vercel.com) com a sua conta do GitHub.
2. Clique em **Add New → Project** e escolha o repositório `editor-ia`.
3. Clique em **Deploy**. Não precisa mudar nenhuma configuração.

## Estrutura

```
src/app/                  página e estilos globais (Next.js)
src/components/editor/
  Editor.tsx              tela principal, palco, atalhos e exportação
  render.ts               desenho da thumbnail no canvas
  templates.ts            modelos prontos e adaptação entre formatos
  Inspector.tsx           ajustes da camada selecionada e lista de camadas
  LeftPanel.tsx           abas Criar, Textos e Ganhar dinheiro
  Previews.tsx            prévia no celular e checklist
  platform.ts             download, salvamento (IndexedDB) e IA no claude.ai
```
