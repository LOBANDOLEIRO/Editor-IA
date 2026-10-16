// Fórmulas de texto curtas para thumbnail, agrupadas pela emoção que provocam.

export const TITLE_FORMULAS: { group: string; items: string[] }[] = [
  { group: "Curiosidade", items: ["NINGUÉM ESPERAVA ISSO", "O QUE ACONTECEU?", "EU NÃO SABIA DISSO", "A VERDADE"] },
  { group: "Opinião", items: ["VALE A PENA?", "MELHOR DO ANO?", "DECEPCIONOU?", "OBRA-PRIMA"] },
  { group: "Resultado", items: ["MUDOU TUDO", "FUNCIONOU!", "ANTES x DEPOIS", "EM 7 DIAS"] },
  { group: "Alerta", items: ["NÃO FAÇA ISSO", "PAREM TUDO", "ERREI FEIO", "CUIDADO!"] },
];

export interface TitleIdea {
  texto: string;
  porque: string;
}

export function ideasPrompt(topic: string, videoTitle: string) {
  return [
    "Você cria o texto que vai escrito em cima de thumbnails do YouTube, em português do Brasil.",
    `Assunto do vídeo: "${topic.slice(0, 400)}"`,
    videoTitle.trim() ? `Título do vídeo: "${videoTitle.slice(0, 200)}"` : "",
    "Regras: de 2 a 5 palavras; em CAIXA ALTA; complementa o título sem repetir; desperta curiosidade sem prometer o que o vídeo não entrega; fácil de ler numa tela de celular.",
    'Responda só com um array JSON de 8 objetos {"texto": string, "porque": string}. "porque" explica em até 12 palavras por que o texto funciona.',
    'Exemplo: [{"texto":"ELE ERROU FEIO?","porque":"A pergunta gera curiosidade e convida a opinar"}]',
  ]
    .filter(Boolean)
    .join("\n");
}

export function countWords(s: string) {
  return s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
