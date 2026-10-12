import {loadFont} from '@remotion/fonts';
import {useAudioData} from '@remotion/media-utils';
import {
	AbsoluteFill,
	Audio,
	Easing,
	Sequence,
	interpolate,
	random,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {LajeNoite, Quintal, Vortice} from './Cenarios';
import {Estouro, Lobandoleiro, POSE_LOBA, Paulinho, PoseLoba, Sambista, TRACO} from './Personagens';
import {CENAS, FALAS} from './tempos';

loadFont({family: 'Bangers', url: staticFile('Bangers-Regular.ttf')});

const VOZ = staticFile('desenho/voz.wav');
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const suave = {...clamp, easing: Easing.inOut(Easing.cubic)};
const [C1, C2, C3, C4, C5, C6, FIM] = CENAS;
const BPM_SAMBA = 104;

// Volume da voz no instante t (para a boca).
const useBoca = (t: number) => {
	const audio = useAudioData(VOZ);
	if (!audio) return 0;
	const canal = audio.channelWaveforms[0];
	const ini = Math.floor(t * audio.sampleRate);
	const fim = Math.min(canal.length, ini + Math.floor(audio.sampleRate / 30));
	let s = 0;
	for (let i = ini; i < fim; i++) s += canal[i] * canal[i];
	const rms = fim > ini ? Math.sqrt(s / (fim - ini)) : 0;
	return interpolate(rms, [0.02, 0.18], [0, 1], clamp);
};

const quemFala = (t: number) => FALAS.find((f) => t >= f.de && t <= f.ate)?.quem;
const piscada = (t: number) => {
	const c = t % 3.3;
	return c > 3.1 ? 1 : 0;
};

// Câmera: foco (fx, fy) e zoom.
const Camera: React.FC<{fx: number; fy: number; z: number; tremor?: number; children: React.ReactNode}> = ({
	fx,
	fy,
	z,
	tremor = 0,
	children,
}) => {
	// Nunca mostra além das bordas do cenário.
	const cx = Math.min(Math.max(fx, 960 / z), 1920 - 960 / z);
	const cy = Math.min(Math.max(fy, 540 / z), 1080 - 540 / z);
	return <g transform={`translate(${960 + tremor} ${540 + tremor * 0.6}) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>;
};

const Titulo: React.FC<{texto: string; sub?: string; e: number; y?: number; tamanho?: number}> = ({
	texto,
	sub,
	e,
	y = 160,
	tamanho = 130,
}) =>
	e <= 0 ? null : (
		<g transform={`translate(960 ${y}) scale(${interpolate(e, [0, 1], [1.6, 1])})`} opacity={e}>
			<text
				textAnchor="middle"
				fontFamily="Bangers"
				fontSize={tamanho}
				fill="#ffc93c"
				stroke={TRACO}
				strokeWidth={12}
				paintOrder="stroke"
				letterSpacing={4}
			>
				{texto}
			</text>
			{sub ? (
				<text
					y={70}
					textAnchor="middle"
					fontFamily="Bangers"
					fontSize={56}
					fill="#fff"
					stroke={TRACO}
					strokeWidth={8}
					paintOrder="stroke"
					letterSpacing={3}
				>
					{sub}
				</text>
			) : null}
		</g>
	);

// --------------------------------------------------------------- cenas

const Cena1: React.FC<{t: number; boca: number}> = ({t, boca}) => {
	const mostra = interpolate(t, [3.3, 3.9], [0, 1], suave);
	const p: PoseLoba = {
		...POSE_LOBA,
		bracoE: {ombro: interpolate(t, [0.4, 0.8, 3.0, 3.4], [12, 150, 150, 12], clamp), cotovelo: -30 + Math.sin(t * 12) * 22 * (t > 0.6 && t < 3.1 ? 1 : 0)},
		bracoD: {ombro: interpolate(mostra, [0, 1], [12, 70]), cotovelo: interpolate(mostra, [0, 1], [-8, -105])},
		boca,
		piscar: piscada(t),
		sobrancelha: t < 1.4 ? 1 : 0,
		cabeca: Math.sin(t * 2) * 3 + (mostra > 0.5 ? 6 : 0),
		olhar: mostra > 0.5 ? 0.8 : 0,
		balanco: Math.sin(t * 4) * 4,
		rabo: Math.sin(t * 3) * 6,
		discoGiro: t * (mostra > 0.5 ? 900 : 60),
		discoBrilho: interpolate(t, [4.2, 6.2], [0, 1], clamp),
	};
	const z = interpolate(t, [0, 3.3, 4.0, 6.85], [1, 1.06, 1.35, 1.55], suave);
	const fx = interpolate(t, [3.3, 4.0], [960, 1040], suave);
	const fy = interpolate(t, [3.3, 4.0], [560, 520], suave);
	const titulo = interpolate(t, [0.2, 0.6, 2.8, 3.2], [0, 1, 1, 0], clamp);
	return (
		<>
			<Camera fx={fx} fy={fy} z={z}>
				<LajeNoite t={t} />
				<Lobandoleiro p={p} x={960} y={1010} escala={0.92} />
			</Camera>
			<g transform="translate(-520 120)">
				<Titulo texto="LOBANDOLEIRO" sub="O VIAJANTE DO TEMPO" e={titulo} y={150} tamanho={110} />
			</g>
			{t > 5.4 ? <Estouro x={1500} y={300} texto="SCRATCH!" escala={interpolate(t, [5.4, 5.6], [0.3, 1], clamp)} /> : null}
		</>
	);
};

const ANOS = ['2020', '2010', '2002', '1997', '1993', '1988', '1985'];

const Cena2: React.FC<{t: number; boca: number}> = ({t, boca}) => {
	const l = t - C2;
	const p: PoseLoba = {
		...POSE_LOBA,
		bracoE: {ombro: 160, cotovelo: -20},
		bracoD: {ombro: 150, cotovelo: -20},
		boca,
		piscar: piscada(t),
		sobrancelha: 1,
		rabo: 30 + Math.sin(t * 10) * 15,
		discoGiro: t * 1400,
		discoBrilho: 1,
		pernas: 10,
	};
	const card = interpolate(t, [C3 - 1.6, C3 - 1.3], [0, 1], clamp);
	return (
		<>
			<Vortice t={l} />
			{ANOS.map((ano, i) => {
				const d = l - 0.4 - i * 0.75;
				if (d < 0 || d > 1.1) return null;
				const s = interpolate(d, [0, 1.1], [0.2, 4], {...clamp, easing: Easing.in(Easing.quad)});
				return (
					<text
						key={ano}
						x={960}
						y={560}
						textAnchor="middle"
						dominantBaseline="central"
						fontFamily="Bangers"
						fontSize={140}
						fill="#ffc93c"
						stroke={TRACO}
						strokeWidth={10}
						paintOrder="stroke"
						transform={`translate(960 560) scale(${s}) translate(-960 -560)`}
						opacity={interpolate(d, [0, 0.2, 0.8, 1.1], [0, 1, 1, 0])}
					>
						{ano}
					</text>
				);
			})}
			<g transform={`rotate(${Math.sin(l * 2) * 18} 960 640)`}>
				<Lobandoleiro p={p} x={960} y={900} escala={0.42 + l * 0.02} />
			</g>
			<Titulo texto="CAPÃO REDONDO" sub="ZONA SUL • ANOS 80" e={card} y={200} tamanho={150} />
		</>
	);
};

type Roda = {
	t: number;
	bocaAmigo: number;
	bocaLoba: number;
	danca: number;
	parados: boolean;
	aponta: boolean;
	sorriso: number;
	espanto: number;
	lobaVisivel: number;
};

// O quintal com a roda de samba; usado nas cenas 3, 4 e 5.
const Roda: React.FC<Roda> = ({t, bocaAmigo, bocaLoba, danca, parados, aponta, sorriso, espanto, lobaVisivel}) => {
	const fase = t;
	const batida = ((t * BPM_SAMBA) / 60) * 2 % 1;
	const olhaP = parados ? 1 : 0;
	return (
		<g>
			<Quintal t={t} />
			<Sambista x={430} y={880} escala={0.7} camisa="#36b37e" pele="#7a4a33" instrumento="cavaco" fase={fase} boca={espanto} olhando={olhaP} parado={parados} />
			<Sambista x={700} y={870} escala={0.72} camisa="#f2c14e" pele="#4e2e22" instrumento="surdo" fase={fase + 0.3} boca={espanto} olhando={olhaP} parado={parados} chapeu />
			<Sambista
				x={1300}
				y={880}
				escala={0.7}
				camisa="#2f6fd1"
				pele="#6b3f2a"
				instrumento="pandeiro"
				fase={fase + 0.6}
				boca={Math.max(bocaAmigo, espanto * 0.6)}
				olhando={-olhaP}
				parado={parados}
				aponta={aponta}
			/>
			<Paulinho
				p={{batida, danca, fase, boca: 0, sorriso, cabeca: Math.sin(t * 6) * 4 * (1 - danca) + Math.sin(t * 9) * 8 * danca}}
				x={1000}
				y={990}
				escala={0.78}
			/>
			{lobaVisivel > 0 ? (
				<g opacity={lobaVisivel}>
					<Lobandoleiro
						p={{
							...POSE_LOBA,
							bracoE: {ombro: 55, cotovelo: -120},
							bracoD: {ombro: 55, cotovelo: -120},
							boca: bocaLoba,
							piscar: piscada(t),
							olhar: -0.8,
							cabeca: -5,
							balanco: Math.sin(t * 3) * 3,
							discoGiro: t * 200,
							discoBrilho: 0.4,
						}}
						x={1700}
						y={1080}
						escala={0.82}
					/>
				</g>
			) : null}
		</g>
	);
};

const Balao: React.FC<{texto: string; x: number; y: number; e: number}> = ({texto, x, y, e}) =>
	e <= 0 ? null : (
		<g transform={`translate(${x} ${y}) scale(${interpolate(e, [0, 1], [0.4, 1])})`}>
			<path d="M -330 -110 Q -340 -200 0 -200 Q 340 -200 330 -110 Q 340 -20 0 -20 L -40 -20 L -110 60 L -90 -20 Q -340 -20 -330 -110 Z" fill="#fff" stroke={TRACO} strokeWidth={10} strokeLinejoin="round" />
			<text y={-92} textAnchor="middle" dominantBaseline="central" fontFamily="Bangers" fontSize={78} fill="#111" letterSpacing={2}>
				{texto}
			</text>
		</g>
	);

const Cena3: React.FC<{t: number; boca: number}> = ({t, boca}) => {
	const z = interpolate(t, [C3, C3 + 1.5, 21.0, 21.4], [1.25, 1, 1, 1.75], suave);
	const fx = interpolate(t, [C3, C3 + 1.5, 21.0, 21.4], [640, 960, 960, 1000], suave);
	const fy = interpolate(t, [21.0, 21.4], [540, 650], suave);
	const batidas = Math.floor(((t - 21.4) * BPM_SAMBA) / 60);
	return (
		<>
			<Camera fx={fx} fy={fy} z={z}>
				<Roda t={t} bocaAmigo={0} bocaLoba={boca} danca={0} parados={false} aponta={false} sorriso={0.6} espanto={0} lobaVisivel={1} />
			</Camera>
			{t > 21.4 ? (
				<Estouro x={batidas % 2 ? 1450 : 470} y={330} texto={batidas % 2 ? 'TUM!' : 'TÁ!'} escala={0.8} giro={batidas % 2 ? 8 : -8} />
			) : null}
		</>
	);
};

const Cena4: React.FC<{t: number; boca: number}> = ({t, boca}) => {
	const danca = interpolate(t, [29.4, 29.8], [0, 1], clamp);
	const b = ((t - C4) * BPM_SAMBA) / 60;
	const tremor = (Math.exp(-((b % 1) * 6)) * 6 * (random(`tr-${Math.floor(t * 30)}`) - 0.5));
	const z = interpolate(t, [C4, C4 + 0.6, 29.3, 29.8], [1, 1.45, 1.45, 1.15], suave);
	const fy = interpolate(t, [C4, C4 + 0.6, 29.3, 29.8], [540, 620, 620, 580], suave);
	return (
		<>
			<Camera fx={interpolate(t, [C4, C4 + 0.6], [960, 1000], suave)} fy={fy} z={z} tremor={tremor}>
				<Roda
					t={t}
					bocaAmigo={0}
					bocaLoba={boca}
					danca={danca}
					parados={t > 25.6}
					aponta={false}
					sorriso={1}
					espanto={t > 25.6 ? 0.7 : 0}
					lobaVisivel={1}
				/>
			</Camera>
			{t > 26.1 && t < 29.4 ? <Estouro x={460} y={260} texto="FUNK!" escala={interpolate(t, [26.1, 26.3], [0.3, 1], clamp)} /> : null}
			{t > 27.6 && t < 29.4 ? <Estouro x={1480} y={300} texto="SUINGUE!" escala={interpolate(t, [27.6, 27.8], [0.3, 0.9], clamp)} cor="#36e0ff" giro={8} /> : null}
			{t > 29.8 ? <Estouro x={960} y={190} texto="ESTILO JAMES BROWN!" escala={interpolate(t, [29.8, 30.0], [0.3, 0.75], clamp)} cor="#ff6fb5" /> : null}
		</>
	);
};

const Cena5: React.FC<{t: number; boca: number; bocaAmigo: number}> = ({t, boca, bocaAmigo}) => {
	const z = interpolate(t, [C5, C5 + 0.4, 34.2, 34.6, 37.2, 37.6], [1.1, 1.55, 1.55, 1, 1, 1.7], suave);
	const fx = interpolate(t, [C5, C5 + 0.4, 34.2, 34.6, 37.2, 37.6], [960, 1300, 1300, 960, 960, 1680], suave);
	const fy = interpolate(t, [C5, C5 + 0.4, 34.2, 34.6, 37.2, 37.6], [540, 560, 560, 540, 540, 520], suave);
	const nome = FALAS[8].ate - 1.0;
	const titulo = interpolate(t, [nome, nome + 0.25], [0, 1], clamp);
	return (
		<>
			<Camera fx={fx} fy={fy} z={z}>
				<Roda
					t={t}
					bocaAmigo={bocaAmigo}
					bocaLoba={boca}
					danca={t < 34.2 ? 1 : 0}
					parados={t < 34.2}
					aponta={t < 34.4}
					sorriso={1}
					espanto={0}
					lobaVisivel={1}
				/>
			</Camera>
			<Balao texto="PAULINHO... BROWN!" x={660} y={330} e={t > 32.7 && t < 34.4 ? interpolate(t, [32.7, 32.9], [0, 1], clamp) : 0} />
			{titulo > 0 ? (
				<>
					<rect width={1920} height={1080} fill="#000" opacity={0.5 * titulo} />
					<Estouro x={960} y={540} texto="MANO BROWN" escala={interpolate(titulo, [0, 1], [0.5, 1.7])} />
				</>
			) : null}
		</>
	);
};

const Cena6: React.FC<{t: number; boca: number}> = ({t, boca}) => {
	const l = t - C6;
	const p: PoseLoba = {
		...POSE_LOBA,
		bracoE: {ombro: 150, cotovelo: -30 + Math.sin(t * 12) * 22},
		bracoD: {ombro: 30, cotovelo: -60},
		boca,
		piscar: piscada(t),
		sobrancelha: Math.sin(t * 2) > 0.7 ? 1 : 0,
		cabeca: Math.sin(t * 2) * 4,
		balanco: Math.sin(t * 4) * 4,
		rabo: Math.sin(t * 3) * 6,
		discoGiro: t * 120,
	};
	const botao = interpolate(l, [1.2, 1.5], [0, 1], clamp);
	return (
		<>
			<Camera fx={960} fy={560} z={1.05}>
				<LajeNoite t={t} />
				<Lobandoleiro p={p} x={700} y={1010} escala={0.9} />
			</Camera>
			<g transform={`translate(1420 360) scale(${botao})`}>
				<text textAnchor="middle" fontFamily="Bangers" fontSize={170} fill="#ffc93c" stroke={TRACO} strokeWidth={14} paintOrder="stroke" letterSpacing={6}>
					LADO B
				</text>
				<g transform={`translate(0 120) scale(${1 + Math.sin(t * 6) * 0.04})`}>
					<rect x={-230} y={-60} width={460} height={110} rx={20} fill="#c8312f" stroke={TRACO} strokeWidth={10} />
					<text y={18} textAnchor="middle" fontFamily="Bangers" fontSize={76} fill="#fff" letterSpacing={3}>
						SE INSCREVE!
					</text>
				</g>
				<text y={270} textAnchor="middle" fontFamily="Bangers" fontSize={46} fill="#fff" stroke={TRACO} strokeWidth={6} paintOrder="stroke" letterSpacing={2}>
					EP. 1 — O DIA EM QUE NASCEU O BROWN
				</text>
			</g>
			<text x={960} y={1050} textAnchor="middle" fontFamily="Bangers" fontSize={30} fill="#fff" opacity={0.8} letterSpacing={2}>
				DRAMATIZAÇÃO BASEADA EM RELATOS SOBRE A ORIGEM DO APELIDO
			</text>
		</>
	);
};

export const Desenho: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const amp = useBoca(t);
	const fala = quemFala(t);
	const boca = fala === 'loba' ? amp : 0;
	const bocaAmigo = fala === 'amigo' ? amp : 0;

	const cena = CENAS.findIndex((c, i) => t >= c && t < (CENAS[i + 1] ?? 999));
	const desde = t - CENAS[Math.max(0, cena)];
	const flash = cena > 0 ? interpolate(desde, [0, 0.25], [0.9, 0], clamp) : 0;
	const fade = interpolate(t, [FIM - 0.8, FIM], [1, 0], clamp);

	return (
		<AbsoluteFill style={{background: '#000'}}>
			<svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{opacity: fade}}>
				{cena === 0 ? <Cena1 t={t} boca={boca} /> : null}
				{cena === 1 ? <Cena2 t={t} boca={boca} /> : null}
				{cena === 2 ? <Cena3 t={t} boca={boca} /> : null}
				{cena === 3 ? <Cena4 t={t} boca={boca} /> : null}
				{cena === 4 ? <Cena5 t={t} boca={boca} bocaAmigo={bocaAmigo} /> : null}
				{cena >= 5 ? <Cena6 t={t} boca={boca} /> : null}
				<rect width={1920} height={1080} fill="#fff" opacity={flash} />
			</svg>
			<Audio src={VOZ} />
			<Audio src={staticFile('desenho/trilha.wav')} volume={0.3} />
			<Sequence from={Math.round(5.35 * fps)} durationInFrames={20}>
				<Audio src={staticFile('sfx_static.wav')} volume={0.5} />
			</Sequence>
			{CENAS.slice(1, 6).map((c) => (
				<Sequence key={c} from={Math.max(0, Math.round((c - 0.3) * fps))} durationInFrames={20}>
					<Audio src={staticFile('noir_whoosh.wav')} volume={0.5} />
				</Sequence>
			))}
			<Sequence from={Math.round((FALAS[8].ate - 1.0) * fps)} durationInFrames={50}>
				<Audio src={staticFile('noir_impacto.wav')} volume={0.5} />
			</Sequence>
		</AbsoluteFill>
	);
};
