import {loadFont} from '@remotion/fonts';
import {useLayoutEffect, useRef} from 'react';
import {
	AbsoluteFill,
	Audio,
	Easing,
	Sequence,
	interpolate,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {EVENTOS, falas} from './roteiro';
import {
	CHAO,
	H,
	W,
	bloco,
	ceu,
	disco,
	etiqueta,
	faiscas,
	lobandoleiro,
	lojaDiscos,
	placa,
	poste,
	predios,
	px,
	rua,
	silhueta,
	texto,
} from './pixel';

loadFont({family: 'PressStart2P', url: staticFile('PressStart2P.ttf')});
loadFont({family: 'VT323', url: staticFile('VT323.ttf')});

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Trajeto do personagem: [tempo, x]. Os pulos acontecem nos trechos marcados.
const TRAJETO_T = [0, 4.25, 4.95, 7.75, 8.6, 10.4];
const TRAJETO_X = [90, 300, 322, 560, 606, 780];
const PULOS = [
	[4.25, 4.95, 30],
	[7.75, 8.6, 34],
	[EVENTOS.titulo, EVENTOS.titulo + 0.5, 14],
] as const;

const xDo = (t: number) => interpolate(t, TRAJETO_T, TRAJETO_X, clamp);
const altura = (t: number) => {
	for (const [a, b, h] of PULOS) {
		if (t >= a && t <= b) {
			const p = (t - a) / (b - a);
			return 4 * h * p * (1 - p);
		}
	}
	return 0;
};
const noAr = (t: number) => altura(t) > 0.5;

const BLOCO_X = Math.round(xDo(4.6)) - 8;
const BLOCO_Y = CHAO - 50 - 30 - 16;
const DISCO_X = Math.round(xDo(8.2));
const DISCO_Y = CHAO - 50 - 30;
const LOJA_X = 470;
const CAM_FINAL = 588;

const camera = (t: number) =>
	t < EVENTOS.chegaCruzamento
		? Math.max(0, xDo(t) - 150)
		: interpolate(t, [EVENTOS.chegaCruzamento, EVENTOS.chegaCruzamento + 1], [xDo(10.4) - 150, CAM_FINAL], {
				...clamp,
				easing: Easing.inOut(Easing.quad),
			});

// Integrantes: zona norte entra pela esquerda, zona sul pela direita.
const INTEGRANTES = [
	{nome: 'KL JAY', zona: 'N', destino: 640, chapeu: 'bone', cor: '#36e0ff', linha: 0, aparece: EVENTOS.nomes[0]},
	{nome: 'EDI ROCK', zona: 'N', destino: 690, chapeu: 'touca', cor: '#7cff6b', linha: 1, aparece: EVENTOS.nomes[3]},
	{nome: 'ICE BLUE', zona: 'S', destino: 870, chapeu: 'bucket', cor: '#ff3fa0', linha: 0, aparece: EVENTOS.nomes[1]},
	{nome: 'MANO BROWN', zona: 'S', destino: 920, chapeu: 'capuz', cor: '#ffd23f', linha: 1, aparece: EVENTOS.nomes[2]},
] as const;

const posIntegrante = (i: (typeof INTEGRANTES)[number], idx: number, t: number) => {
	const norte = i.zona === 'N';
	const ini = (norte ? EVENTOS.zonaNorteEntra : EVENTOS.zonaSulEntra) + (idx % 2) * 0.25;
	const inicio = norte ? CAM_FINAL - 20 - (idx % 2) * 18 : CAM_FINAL + W + 20 + (idx % 2) * 18;
	const x = interpolate(t, [ini, ini + 1.8], [inicio, i.destino], clamp);
	return {x, andando: t > ini && t < ini + 1.8, visivel: t > ini - 0.1};
};

const desenhar = (ctx: CanvasRenderingContext2D, t: number) => {
	ctx.imageSmoothingEnabled = false;
	const cam = Math.round(camera(t));

	ceu(ctx, cam);
	predios(ctx, cam, 0.15, 'longe', 150, {corpo: '#2a1638', janela: '#b0557a', apagada: '#2a1638'}, 55);
	predios(ctx, cam, 0.45, 'meio', 176, {corpo: '#3a2147', janela: '#ffd36b', apagada: '#2c1838'}, 45);
	rua(ctx, cam);

	ctx.save();
	ctx.translate(-cam, 0);
	for (let x = 40; x < 1100; x += 150) poste(ctx, x, t);
	lojaDiscos(ctx, LOJA_X, t);
	const brilhoN = t > EVENTOS.zonaNorteEntra && t < EVENTOS.zonaNorteEntra + 2 ? 1 : 0;
	const brilhoS = t > EVENTOS.zonaSulEntra && t < EVENTOS.zonaSulEntra + 2 ? 1 : 0;
	placa(ctx, 612 + 92, 'ZONA NORTE', -1, Math.floor(t * 6) % 2 ? brilhoN : 0);
	placa(ctx, 868, 'ZONA SUL', 1, Math.floor(t * 6) % 2 ? brilhoS : 0);

	// Bloco "?" que ele acerta com a cabeça na pergunta.
	const db = t - EVENTOS.blocoInterrogacao;
	const empurra = db > 0 && db < 0.15 ? -3 : 0;
	bloco(ctx, BLOCO_X, BLOCO_Y + empurra, db > 0, t);
	if (db > 0 && db < 1.6) {
		const sobe = Math.min(db, 0.5) * 50;
		ctx.globalAlpha = interpolate(db, [1.1, 1.6], [1, 0], clamp);
		texto(ctx, '?', BLOCO_X + 8, BLOCO_Y - 14 - sobe, '#ffd23f', 16, '#7a3a00', 'center');
		ctx.globalAlpha = 1;
	}

	// Disco do "Racional", coletado no pulo.
	const dd = t - EVENTOS.discoColetado;
	if (dd < 0) disco(ctx, DISCO_X, DISCO_Y + Math.round(Math.sin(t * 4) * 2), t);
	faiscas(ctx, DISCO_X, DISCO_Y, dd);
	if (dd > 0 && dd < 1.4) {
		ctx.globalAlpha = interpolate(dd, [1, 1.4], [1, 0], clamp);
		texto(ctx, '+1 RACIONAL', DISCO_X, DISCO_Y - 16 - dd * 14, '#ffd23f', 8, '#7a3a00', 'center');
		ctx.globalAlpha = 1;
	}

	// Integrantes.
	INTEGRANTES.forEach((i, idx) => {
		const pos = posIntegrante(i, idx, t);
		if (!pos.visivel) return;
		const pula = t >= EVENTOS.titulo + 0.08 * idx && t < EVENTOS.titulo + 0.5 + 0.08 * idx;
		const yPulo = pula ? 4 * 12 * ((t - EVENTOS.titulo - 0.08 * idx) / 0.5) * (1 - (t - EVENTOS.titulo - 0.08 * idx) / 0.5) : 0;
		silhueta(ctx, pos.x, CHAO - yPulo, {
			t,
			andando: pos.andando,
			direcao: pos.andando ? (i.zona === 'N' ? 1 : -1) : pos.x < xDo(t) ? 1 : -1,
			cor: i.cor,
			chapeu: i.chapeu,
		});
		etiqueta(ctx, pos.x, CHAO - 74 - i.linha * 16, i.nome, i.cor === '#ffd23f' ? '#b8860b' : '#5a2a8a', t - i.aparece);
	});

	// O Lobandoleiro.
	const x = xDo(t);
	const andando = t < EVENTOS.chegaCruzamento && !noAr(t);
	const direcao: 1 | -1 =
		t > EVENTOS.zonaNorteEntra + 0.4 && t < EVENTOS.zonaSulEntra + 0.4 ? -1 : 1;
	lobandoleiro(ctx, x, CHAO - altura(t), {
		t,
		andando,
		velocidade: t > 4.95 && t < 10.4 ? 13 : 9,
		noAr: noAr(t),
		direcao,
		brilho: t > EVENTOS.discoColetado && t < EVENTOS.discoColetado + 1.2,
	});
	ctx.restore();

	// Título final.
	const dt = t - EVENTOS.titulo;
	if (dt > 0) {
		const y = interpolate(dt, [0, 0.4, 0.55, 0.7], [-30, 34, 28, 32], clamp);
		px(ctx, '#000', 54, y - 8, W - 108, 34);
		px(ctx, '#d42a2a', 56, y - 6, W - 112, 30);
		px(ctx, '#7a1414', 56, y + 20, W - 112, 4);
		texto(ctx, "RACIONAIS MC'S", W / 2, y, '#ffd23f', 16, '#000', 'center');
	}

	// Fade final.
	const escuro = interpolate(t, [22.2, 23], [0, 1], clamp);
	if (escuro > 0) {
		ctx.globalAlpha = escuro;
		px(ctx, '#000', 0, 0, W, H);
		ctx.globalAlpha = 1;
	}
};

const Legenda: React.FC<{t: number}> = ({t}) => {
	const fala = falas.find((f) => t >= f.de && t <= f.ate);
	if (!fala) return null;
	const entra = interpolate(t, [fala.de, fala.de + 0.15], [0, 1], clamp);
	return (
		<div
			style={{
				position: 'absolute',
				left: 120,
				right: 120,
				top: 40,
				padding: '18px 34px 22px',
				background: 'rgba(10, 8, 30, 0.88)',
				border: '6px solid #f4f4f4',
				outline: '5px solid #0a081e',
				borderRadius: 10,
				fontFamily: 'VT323',
				fontSize: 66,
				lineHeight: 1.05,
				textAlign: 'center',
				transform: `scaleY(${entra})`,
				textShadow: '4px 4px 0 #000',
			}}
		>
			{fala.palavras.map((p, i) => {
				const prox = fala.palavras[i + 1]?.s ?? fala.ate;
				const atual = t >= p.s && t < prox;
				const dita = t >= p.s;
				return (
					<span key={i} style={{color: atual ? '#ffd23f' : dita ? '#ffffff' : '#6b6880'}}>
						{p.w}{' '}
					</span>
				);
			})}
		</div>
	);
};

export const Historia: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const ref = useRef<HTMLCanvasElement>(null);

	useLayoutEffect(() => {
		const ctx = ref.current?.getContext('2d');
		if (ctx) desenhar(ctx, t);
	}, [t]);

	const som = (arquivo: string, seg: number, volume = 0.5, dur = 1.5) => (
		<Sequence from={Math.round(seg * fps)} durationInFrames={Math.round(dur * fps)}>
			<Audio src={staticFile(arquivo)} volume={volume} />
		</Sequence>
	);

	return (
		<AbsoluteFill style={{background: '#000'}}>
			<canvas
				ref={ref}
				width={W}
				height={H}
				style={{width: 1920, height: 1080, imageRendering: 'pixelated'}}
			/>
			<Legenda t={t} />
			<div
				style={{
					position: 'absolute',
					right: 50,
					bottom: 40,
					fontFamily: 'PressStart2P',
					fontSize: 26,
					color: '#ffd23f',
					textShadow: '4px 4px 0 #d42a2a',
					opacity: 0.9,
				}}
			>
				LADO B
			</div>
			{/* Scanlines leves de CRT */}
			<AbsoluteFill
				style={{
					background:
						'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 2px, transparent 2px, transparent 5px)',
				}}
			/>

			<Audio src={staticFile('narracao.wav')} />
			<Audio src={staticFile('trilha.wav')} volume={0.13} />
			{som('sfx_pulo.wav', 4.25, 0.35)}
			{som('sfx_bloco.wav', EVENTOS.blocoInterrogacao, 0.45)}
			{som('sfx_coin.wav', EVENTOS.blocoInterrogacao + 0.05, 0.3)}
			{som('sfx_pulo.wav', 7.75, 0.35)}
			{som('sfx_poder.wav', EVENTOS.discoColetado, 0.35)}
			{EVENTOS.nomes.map((s) => (
				<Sequence key={s} from={Math.round(s * fps)} durationInFrames={20}>
					<Audio src={staticFile('sfx_pop.wav')} volume={0.3} />
				</Sequence>
			))}
			{som('sfx_jingle.wav', EVENTOS.titulo, 0.35)}
		</AbsoluteFill>
	);
};
