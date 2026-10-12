import {random} from 'remotion';

// Desenho em pixel art numa tela de 384x216 (ampliada 5x para 1080p).
export const W = 384;
export const H = 216;
export const CHAO = 184;

type Ctx = CanvasRenderingContext2D;

export const px = (ctx: Ctx, cor: string, x: number, y: number, w: number, h: number) => {
	ctx.fillStyle = cor;
	ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

export const texto = (
	ctx: Ctx,
	t: string,
	x: number,
	y: number,
	cor: string,
	tamanho = 8,
	sombra = '#000',
	alinhar: CanvasTextAlign = 'left',
) => {
	ctx.font = `${tamanho}px PressStart2P`;
	ctx.textAlign = alinhar;
	ctx.textBaseline = 'top';
	ctx.fillStyle = sombra;
	ctx.fillText(t, Math.round(x) + 1, Math.round(y) + 1);
	ctx.fillStyle = cor;
	ctx.fillText(t, Math.round(x), Math.round(y));
};

// ---------------------------------------------------------------- cenário

const CEU = ['#140b2b', '#24113f', '#3d1650', '#62205c', '#8f2e62', '#c2456b', '#e46d5d', '#f29e4c'];

export const ceu = (ctx: Ctx, cam: number) => {
	const faixa = Math.ceil(150 / CEU.length);
	CEU.forEach((c, i) => px(ctx, c, 0, i * faixa, W, faixa));
	// Sol se pondo atrás dos prédios.
	const sx = 260 - cam * 0.03;
	for (let r = 0; r < 26; r++) {
		const meia = Math.round(Math.sqrt(26 * 26 - r * r));
		px(ctx, r % 4 === 3 ? '#f2b84c' : '#ffd36b', sx - meia, 132 - r, meia * 2, 1);
	}
	// Estrelas no alto.
	for (let i = 0; i < 40; i++) {
		const x = (random(`estrela-x-${i}`) * W * 2 - cam * 0.02) % W;
		const y = random(`estrela-y-${i}`) * 50;
		px(ctx, i % 3 ? '#8c7bb8' : '#ffffff', (x + W) % W, y, 1, 1);
	}
};

// Camada de prédios com paralaxe; `fator` controla a velocidade.
export const predios = (
	ctx: Ctx,
	cam: number,
	fator: number,
	semente: string,
	base: number,
	cores: {corpo: string; janela: string; apagada: string},
	alturaMax: number,
) => {
	let x = -cam * fator - 20;
	let i = 0;
	while (x < W + 60) {
		const r = (k: string) => random(`${semente}-${k}-${i}`);
		const largura = 24 + Math.floor(r('w') * 40);
		const altura = 30 + Math.floor(r('h') * alturaMax);
		const topo = base - altura;
		px(ctx, cores.corpo, x, topo, largura, altura);
		// Caixa d'água / antena.
		if (r('a') < 0.4) px(ctx, cores.corpo, x + 4, topo - 6, 8, 6);
		if (r('b') < 0.3) px(ctx, cores.corpo, x + largura - 6, topo - 12, 1, 12);
		// Pichação no topo.
		if (r('p') < 0.35) {
			for (let k = 0; k < largura - 6; k += 3) {
				px(ctx, '#0b0712', x + 3 + k, topo + 3 + (k % 2), 2, r(`pl${k}`) < 0.5 ? 3 : 2);
			}
		}
		// Janelas.
		for (let jy = topo + 9; jy < base - 6; jy += 7) {
			for (let jx = x + 4; jx < x + largura - 5; jx += 6) {
				const acesa = random(`${semente}-jan-${i}-${jx - x}-${jy}`) < 0.32;
				px(ctx, acesa ? cores.janela : cores.apagada, jx, jy, 3, 4);
			}
		}
		x += largura + Math.floor(r('g') * 6);
		i++;
	}
};

export const rua = (ctx: Ctx, cam: number) => {
	// Calçada com o desenho de ondas da calçada paulista.
	px(ctx, '#2b2433', 0, CHAO, W, 4);
	for (let x = -(cam % 16); x < W; x += 16) {
		px(ctx, '#d8d0c4', x, CHAO + 4, 16, 10);
		px(ctx, '#1d1a22', x + 2, CHAO + 6, 6, 2);
		px(ctx, '#1d1a22', x + 6, CHAO + 8, 6, 2);
		px(ctx, '#1d1a22', x + 10, CHAO + 10, 4, 2);
	}
	px(ctx, '#8d8697', 0, CHAO + 14, W, 3); // guia
	px(ctx, '#2a2830', 0, CHAO + 17, W, H - CHAO - 17); // asfalto
	for (let x = -(cam % 48); x < W; x += 48) px(ctx, '#e8c547', x, CHAO + 25, 22, 2);
};

export const poste = (ctx: Ctx, x: number, t: number) => {
	px(ctx, '#3a3542', x, CHAO - 72, 3, 72);
	px(ctx, '#3a3542', x, CHAO - 72, 14, 3);
	px(ctx, '#ffe9a3', x + 10, CHAO - 69, 5, 2);
	// Luz no chão.
	ctx.globalAlpha = 0.12 + Math.sin(t * 9 + x) * 0.02;
	ctx.fillStyle = '#ffe9a3';
	ctx.beginPath();
	ctx.moveTo(x + 10, CHAO - 67);
	ctx.lineTo(x - 12, CHAO);
	ctx.lineTo(x + 36, CHAO);
	ctx.fill();
	ctx.globalAlpha = 1;
};

export const lojaDiscos = (ctx: Ctx, x: number, t: number) => {
	px(ctx, '#2d1f3a', x, CHAO - 70, 110, 70);
	px(ctx, '#d42a2a', x - 4, CHAO - 76, 118, 16);
	texto(ctx, 'DISCOS', x + 55, CHAO - 72, Math.floor(t * 3) % 2 ? '#ffd23f' : '#fff6c8', 8, '#5a0f0f', 'center');
	px(ctx, '#0e3a4c', x + 8, CHAO - 52, 60, 40); // vitrine
	for (let k = 0; k < 3; k++) {
		const cx = x + 20 + k * 18;
		px(ctx, '#0a0a0a', cx - 7, CHAO - 42, 14, 14);
		px(ctx, ['#ffd23f', '#36e0ff', '#ff3fa0'][k], cx - 2, CHAO - 37, 4, 4);
	}
	px(ctx, '#140d1c', x + 78, CHAO - 44, 22, 44); // porta
	px(ctx, '#ffd23f', x + 95, CHAO - 24, 2, 2);
};

export const placa = (ctx: Ctx, x: number, nome: string, seta: -1 | 1, brilho: number) => {
	px(ctx, '#56525e', x, CHAO - 118, 3, 118);
	const largura = nome.length * 8 + 22;
	const px0 = seta === -1 ? x - largura + 3 : x;
	px(ctx, '#f4f4f4', px0 - 1, CHAO - 121, largura + 2, 16);
	px(ctx, brilho > 0 ? '#1f8f4a' : '#146b37', px0, CHAO - 120, largura, 14);
	const flecha = seta === -1 ? '<' : '>';
	texto(ctx, seta === -1 ? `${flecha} ${nome}` : `${nome} ${flecha}`, px0 + 5, CHAO - 117, '#fff', 8, '#0b3d1f');
};

export const bloco = (ctx: Ctx, x: number, y: number, usado: boolean, t: number) => {
	px(ctx, '#000', x - 1, y - 1, 18, 18);
	px(ctx, usado ? '#8a5a2b' : '#f2a03a', x, y, 16, 16);
	px(ctx, usado ? '#6b4320' : '#c96f1a', x, y + 14, 16, 2);
	px(ctx, usado ? '#6b4320' : '#c96f1a', x + 14, y, 2, 16);
	[[1, 1], [13, 1], [1, 13], [13, 13]].forEach(([a, b]) => px(ctx, '#000', x + a, y + b, 1, 1));
	if (!usado) texto(ctx, '?', x + 4, y + 4, Math.floor(t * 4) % 2 ? '#fff' : '#ffe9a3', 8, '#7a3a00');
};

export const disco = (ctx: Ctx, x: number, y: number, t: number) => {
	const r = 9;
	for (let dy = -r; dy <= r; dy++) {
		const meia = Math.round(Math.sqrt(r * r - dy * dy));
		px(ctx, '#0a0a0a', x - meia, y + dy, meia * 2, 1);
	}
	px(ctx, '#2a2a2a', x - 6, y - 1, 12, 1); // sulcos
	px(ctx, '#2a2a2a', x - 1, y - 6, 1, 12);
	px(ctx, '#f2a03a', x - 3, y - 3, 6, 6); // selo
	px(ctx, '#000', x, y, 1, 1);
	const brilho = Math.floor(t * 6) % 3;
	px(ctx, '#ffffff', x - 6 + brilho * 4, y - 6, 1, 1);
};

export const faiscas = (ctx: Ctx, x: number, y: number, dt: number, cor = '#ffd23f') => {
	if (dt < 0 || dt > 0.6) return;
	for (let k = 0; k < 10; k++) {
		const ang = (k / 10) * Math.PI * 2;
		const d = 4 + dt * 50;
		px(ctx, k % 2 ? cor : '#fff', x + Math.cos(ang) * d, y + Math.sin(ang) * d, 2, 2);
	}
};

// ---------------------------------------------------------------- personagens

const PELE = '#7a4a33';
const PELE_ESC = '#5a3424';
const FADE = '#4a3127';
const CABELO = '#120d0c';
const BARBA = '#151010';
const TATTOO = '#2b1a12';
const CAMISA = '#15151a';

export type Pose = {
	t: number;
	andando: boolean;
	velocidade?: number; // passos por segundo
	noAr?: boolean;
	direcao: 1 | -1;
	brilho?: boolean;
};

// O Lobandoleiro: corpo largo, camiseta preta, locs presos, barba e tatuagens.
export const lobandoleiro = (ctx: Ctx, x: number, y: number, p: Pose) => {
	const fase = p.t * (p.velocidade ?? 9);
	const passo = p.andando ? Math.round(Math.sin(fase) * 3) : 0;
	const pulo = p.andando ? (Math.abs(Math.sin(fase)) > 0.6 ? -1 : 0) : Math.sin(p.t * 3) > 0 ? 0 : -1;
	const b = p.noAr ? 0 : pulo;
	const rabo = p.andando || p.noAr ? Math.round(Math.sin(fase + 1.5)) : 0;

	// Sombra.
	ctx.globalAlpha = 0.35;
	px(ctx, '#000', x - 10, CHAO - 1, 20, 2);
	ctx.globalAlpha = 1;

	ctx.save();
	ctx.translate(Math.round(x), Math.round(y));
	ctx.scale(p.direcao, 1);

	const pernas = p.noAr ? [-3, 3] : [-passo, passo];
	const alturaPerna = p.noAr ? -2 : 0;
	pernas.forEach((lx, k) => {
		px(ctx, k === 0 ? PELE_ESC : PELE, lx - 2, -9 + alturaPerna, 4, 6);
		px(ctx, '#e8e8e8', lx - 2, -3 + alturaPerna, 7, 3);
		px(ctx, '#444', lx - 2, -1 + alturaPerna, 7, 1);
	});
	// Braço de trás.
	const braco = p.noAr ? -4 : passo;
	px(ctx, PELE_ESC, -2 - braco, -30 + b, 4, 12);
	px(ctx, CAMISA, -2 - braco, -31 + b, 4, 4);
	// Bermuda e camiseta oversized.
	px(ctx, '#6f7280', -7, -17 + b, 14, 8);
	px(ctx, '#55576a', -1, -13 + b, 1, 4);
	px(ctx, CAMISA, -9, -33 + b, 18, 17);
	px(ctx, CAMISA, -8, -27 + b, 19, 9); // barriga
	px(ctx, '#24242c', -9, -33 + b, 18, 1);
	// Braço da frente, tatuado.
	const bf = p.noAr ? 5 : passo;
	px(ctx, PELE, -1 + bf, -30 + b, 5, 12);
	px(ctx, '#202028', -1 + bf, -31 + b, 5, 5);
	px(ctx, TATTOO, bf, -25 + b, 3, 1);
	px(ctx, TATTOO, bf + 1, -23 + b, 3, 1);
	px(ctx, TATTOO, bf, -21 + b, 2, 1);
	px(ctx, PELE_ESC, -1 + bf, -18 + b, 5, 3);
	// Pescoço tatuado.
	px(ctx, PELE, -3, -36 + b, 8, 4);
	px(ctx, TATTOO, -1, -36 + b, 1, 3);
	px(ctx, TATTOO, 1, -35 + b, 1, 2);
	px(ctx, TATTOO, 3, -36 + b, 1, 3);
	// Cabeça larga.
	px(ctx, PELE, -6, -47 + b, 13, 11);
	px(ctx, PELE, -5, -39 + b, 13, 4);
	px(ctx, FADE, -6, -47 + b, 5, 6); // degradê na lateral
	px(ctx, PELE_ESC, -3, -43 + b, 2, 3); // orelha
	// Locs no topo e rabinho.
	px(ctx, CABELO, -6, -50 + b, 12, 3);
	px(ctx, CABELO, -4, -51 + b, 8, 1);
	px(ctx, CABELO, 5, -48 + b, 2, 1); // risco do line-up
	px(ctx, '#000', -8, -49 + b, 2, 2);
	px(ctx, CABELO, -11, -50 + b + rabo, 4, 2);
	px(ctx, CABELO, -12, -48 + b + rabo, 2, 5);
	px(ctx, CABELO, -10, -48 + b + rabo, 1, 4);
	// Rosto.
	px(ctx, CABELO, 2, -45 + b, 5, 2); // sobrancelha grossa
	px(ctx, '#f1e9de', 3, -43 + b, 2, 2);
	px(ctx, '#120a08', 4, -43 + b, 1, 2);
	px(ctx, TATTOO, 0, -44 + b, 1, 3); // ankh
	px(ctx, TATTOO, -1, -43 + b, 3, 1);
	px(ctx, PELE_ESC, 7, -42 + b, 2, 3); // nariz
	px(ctx, BARBA, 3, -39 + b, 5, 1); // bigode
	px(ctx, BARBA, 3, -38 + b, 1, 2);
	px(ctx, '#4a2a22', 5, -38 + b, 2, 1); // boca
	px(ctx, BARBA, 2, -37 + b, 6, 3); // barba
	px(ctx, BARBA, 3, -34 + b, 4, 1);
	px(ctx, '#9a9690', 5, -36 + b, 1, 1);
	px(ctx, '#9a9690', 3, -35 + b, 1, 1);

	ctx.restore();

	if (p.brilho) {
		for (let k = 0; k < 6; k++) {
			const a = p.t * 8 + k;
			px(ctx, k % 2 ? '#ffd23f' : '#fff', x + Math.cos(a) * 14, y - 26 + Math.sin(a) * 22, 2, 2);
		}
	}
};

// Integrantes como silhuetas com contorno colorido (sem retratar rostos reais).
export const silhueta = (
	ctx: Ctx,
	x: number,
	y: number,
	p: Pose & {cor: string; chapeu: 'bone' | 'touca' | 'capuz' | 'bucket'},
) => {
	const fase = p.t * 9;
	const passo = p.andando ? Math.round(Math.sin(fase) * 3) : 0;
	const b = p.andando ? (Math.abs(Math.sin(fase)) > 0.6 ? -1 : 0) : Math.sin(p.t * 3 + x) > 0 ? 0 : -1;
	const corpo = '#0d0b14';

	ctx.globalAlpha = 0.35;
	px(ctx, '#000', x - 8, CHAO - 1, 16, 2);
	ctx.globalAlpha = 1;

	ctx.save();
	ctx.translate(Math.round(x), Math.round(y));
	ctx.scale(p.direcao, 1);
	[-passo, passo].forEach((lx) => {
		px(ctx, corpo, lx - 2, -14, 5, 14);
		px(ctx, p.cor, lx + 2, -14, 1, 12);
	});
	px(ctx, corpo, -7, -34 + b, 14, 21);
	px(ctx, corpo, -1 + passo, -31 + b, 4, 13);
	px(ctx, p.cor, 6, -33 + b, 1, 19);
	px(ctx, corpo, -3, -37 + b, 6, 3);
	px(ctx, corpo, -5, -47 + b, 11, 11);
	px(ctx, p.cor, 6, -46 + b, 1, 9);
	px(ctx, p.cor, 3, -43 + b, 2, 1); // brilho do olho
	if (p.chapeu === 'bone') {
		px(ctx, corpo, -5, -50 + b, 11, 4);
		px(ctx, corpo, 5, -47 + b, 5, 1);
		px(ctx, p.cor, -5, -50 + b, 11, 1);
	} else if (p.chapeu === 'touca') {
		px(ctx, corpo, -5, -52 + b, 11, 6);
		px(ctx, p.cor, -4, -52 + b, 9, 1);
	} else if (p.chapeu === 'bucket') {
		px(ctx, corpo, -4, -51 + b, 9, 5);
		px(ctx, corpo, -7, -47 + b, 15, 1);
		px(ctx, p.cor, -7, -47 + b, 15, 1);
	} else {
		px(ctx, corpo, -7, -49 + b, 13, 14);
		px(ctx, p.cor, -7, -49 + b, 13, 1);
		px(ctx, corpo, -1, -45 + b, 7, 8);
	}
	ctx.restore();
};

export const etiqueta = (ctx: Ctx, x: number, y: number, nome: string, cor: string, dt: number) => {
	if (dt < 0) return;
	const pulo = dt < 0.25 ? Math.round(Math.sin((dt / 0.25) * Math.PI) * -6) : 0;
	const largura = nome.length * 8 + 8;
	px(ctx, '#000', x - largura / 2 - 1, y - 1 + pulo, largura + 2, 14);
	px(ctx, cor, x - largura / 2, y + pulo, largura, 12);
	texto(ctx, nome, x, y + 2 + pulo, '#fff', 8, '#000', 'center');
	px(ctx, cor, x - 2, y + 12 + pulo, 4, 3);
};
