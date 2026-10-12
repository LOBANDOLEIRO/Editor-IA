// Narração "Rua Benjamin Capusso 82": transcrita com Whisper (tempos por palavra,
// em segundos) e com os nomes corrigidos à mão.

export type Palavra = {w: string; s: number};
export type Fala = {de: number; ate: number; palavras: Palavra[]};

const p = (texto: string, tempos: number[]): Palavra[] =>
	texto.split(' ').map((w, i) => ({w, s: tempos[i]}));

export const falas: Fala[] = [
	{
		de: 0,
		ate: 5.4,
		palavras: p('Você sabia por que o grupo Racionais MC\'s se chama Racionais MC\'s?', [
			0, 0.9, 1.22, 1.4, 1.56, 1.72, 1.98, 2.6, 3.26, 3.54, 3.84, 4.72,
		]),
	},
	{
		de: 5.7,
		ate: 9.0,
		palavras: p('Essa é uma inspiração direta ao Tim Maia Racional.', [
			5.78, 5.84, 5.94, 6.04, 6.52, 7.44, 7.7, 7.98, 8.34,
		]),
	},
	{
		de: 9.6,
		ate: 16.6,
		palavras: p(
			'Em 1995, se juntaram dois integrantes da zona norte e dois integrantes da zona sul:',
			[9.66, 9.78, 11.64, 11.72, 12.68, 13.08, 13.66, 13.84, 14.44, 14.76, 14.96, 15.04, 15.4, 15.56, 15.76],
		),
	},
	{
		de: 16.9,
		ate: 20.1,
		palavras: p('KL Jay, Ice Blue, Mano Brown e Edi Rock.', [
			17.02, 17.2, 17.42, 17.68, 18.66, 18.86, 19.1, 19.4, 19.66,
		]),
	},
];

// Momentos do jogo amarrados à narração (segundos).
export const EVENTOS = {
	blocoInterrogacao: 4.62, // "...MC's?"
	discoColetado: 8.3, // "...Racional."
	chegaCruzamento: 10.4,
	zonaNorteEntra: 12.4, // chegam em "norte"
	zonaSulEntra: 14.6, // chegam em "sul"
	nomes: [17.02, 17.42, 18.66, 19.4], // KL Jay, Ice Blue, Mano Brown, Edi Rock
	titulo: 20.1,
};

export const DURACAO_S = 23;
