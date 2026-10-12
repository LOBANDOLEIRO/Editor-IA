import {loadFont} from '@remotion/fonts';
import {
	AbsoluteFill,
	Audio,
	Easing,
	Img,
	Sequence,
	interpolate,
	random,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {falas} from '../historia/roteiro';

// Versão "Dark Deco": imagens geradas por IA animadas em 2.5D no Remotion.

loadFont({family: 'Limelight', url: staticFile('Limelight-Regular.ttf')});
loadFont({family: 'Bebas', url: staticFile('BebasNeue-Regular.ttf')});

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const suave = {...clamp, easing: Easing.inOut(Easing.cubic)};

// Cortes entre cenas, em segundos.
const CORTES = [0, 5.6, 9.4, 16.8, 20.15, 23];
const IMPACTOS = [4.72, 8.34, 20.15];
const BARRA = 110;

const OURO = 'linear-gradient(180deg, #fff1b8 0%, #f2c45a 45%, #a8701c 100%)';

const textoOuro = (tamanho: number): React.CSSProperties => ({
	fontFamily: 'Limelight',
	fontSize: tamanho,
	lineHeight: 1,
	background: OURO,
	WebkitBackgroundClip: 'text',
	color: 'transparent',
	filter: 'drop-shadow(6px 6px 0 #1a0505) drop-shadow(0 0 30px rgba(255,170,60,0.45))',
});

// Camada de imagem que cobre o quadro, com zoom/pan a partir de um ponto.
const Camada: React.FC<{
	src: string;
	escala: number;
	x?: number;
	y?: number;
	origem?: string;
	desfoque?: number;
}> = ({src, escala, x = 0, y = 0, origem = '50% 50%', desfoque = 0}) => (
	<AbsoluteFill style={{transform: `translate(${x}px, ${y}px) scale(${escala})`, transformOrigin: origem}}>
		<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: desfoque ? `blur(${desfoque}px)` : undefined}} />
	</AbsoluteFill>
);

const Chuva: React.FC<{t: number; intensidade?: number}> = ({t, intensidade = 1}) => (
	<AbsoluteFill style={{opacity: 0.5 * intensidade}}>
		<svg width={1920} height={1080}>
			{new Array(140).fill(0).map((_, i) => {
				const x0 = random(`chuva-x-${i}`) * 2100;
				const vel = 1500 + random(`chuva-v-${i}`) * 900;
				const y = ((random(`chuva-y-${i}`) * 1300 + t * vel) % 1300) - 150;
				const x = x0 - (y + 150) * 0.18;
				return (
					<line key={i} x1={x} y1={y} x2={x - 9} y2={y + 48} stroke="#ffd9a8" strokeWidth={1.6} strokeOpacity={0.55} />
				);
			})}
		</svg>
	</AbsoluteFill>
);

const Granulado: React.FC<{frame: number}> = ({frame}) => (
	<AbsoluteFill style={{opacity: 0.16, mixBlendMode: 'overlay'}}>
		<svg width={1920} height={1080}>
			<filter id={`grao-${frame % 6}`}>
				<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 6} />
			</filter>
			<rect width="100%" height="100%" filter={`url(#grao-${frame % 6})`} />
		</svg>
	</AbsoluteFill>
);

// --------------------------------------------------------------- cenas

const Cena1: React.FC<{t: number}> = ({t}) => {
	const p = interpolate(t, [0, 5.6], [0, 1], clamp);
	const fundo = 1.06 + p * 0.08;
	const frente = 1.06 + p * 0.13;
	const pisca = random(`poste-${Math.floor(t * 12)}`) < 0.08 ? 0.55 : 1;
	const q = t - 4.72;
	const qEscala = interpolate(q, [0, 0.12, 0.3], [3, 0.9, 1], clamp);
	return (
		<AbsoluteFill>
			<Camada src="noir/cena1.jpg" escala={fundo} origem="38% 32%" desfoque={3} />
			<Camada src="noir/cena1_recorte.png" escala={frente} origem="38% 32%" />
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse at 37% 5%, rgba(255,200,110,0.35), transparent 45%)',
					opacity: pisca,
					mixBlendMode: 'screen',
				}}
			/>
			<Chuva t={t} />
			{q > 0 ? (
				<div
					style={{
						position: 'absolute',
						right: 230,
						top: 170,
						...textoOuro(520),
						transform: `scale(${qEscala}) rotate(-6deg)`,
					}}
				>
					?
				</div>
			) : null}
		</AbsoluteFill>
	);
};

const Cena2: React.FC<{t: number}> = ({t}) => {
	const l = t - 5.6;
	const p = interpolate(l, [0, 3.8], [0, 1], clamp);
	const brilho = 0.35 + Math.sin(t * 5) * 0.12 + interpolate(t - 8.34, [0, 0.1, 0.8], [0, 0.6, 0], clamp);
	const tim = interpolate(t, [7.6, 7.9], [0, 1], suave);
	const rac = t - 8.3;
	return (
		<AbsoluteFill>
			<Camada src="noir/cena2.jpg" escala={1.08 + p * 0.14} x={-p * 30} y={p * 10} origem="40% 55%" />
			<AbsoluteFill
				style={{
					background: 'radial-gradient(circle at 38% 55%, rgba(255,190,90,0.9), transparent 35%)',
					opacity: brilho,
					mixBlendMode: 'screen',
				}}
			/>
			<div style={{position: 'absolute', right: 120, bottom: 230, textAlign: 'right'}}>
				<div
					style={{
						fontFamily: 'Bebas',
						fontSize: 70,
						letterSpacing: 18,
						color: '#ffe3b0',
						opacity: tim,
						transform: `translateY(${(1 - tim) * 30}px)`,
						textShadow: '4px 4px 0 #1a0505',
					}}
				>
					TIM MAIA
				</div>
				{rac > 0 ? (
					<div style={{...textoOuro(190), transform: `scale(${interpolate(rac, [0, 0.12, 0.3], [1.6, 0.95, 1], clamp)})`}}>
						RACIONAL
					</div>
				) : null}
			</div>
		</AbsoluteFill>
	);
};

const Zona: React.FC<{texto: string; t: number; de: number; lado: 'esq' | 'dir'}> = ({texto, t, de, lado}) => {
	const e = interpolate(t, [de, de + 0.35], [0, 1], suave);
	if (e <= 0) return null;
	return (
		<div
			style={{
				position: 'absolute',
				top: 250,
				[lado === 'esq' ? 'left' : 'right']: 140,
				opacity: e,
				transform: `translateX(${(lado === 'esq' ? -1 : 1) * (1 - e) * 80}px)`,
				textAlign: lado === 'esq' ? 'left' : 'right',
			}}
		>
			<div style={textoOuro(110)}>{texto}</div>
			<div
				style={{
					height: 6,
					marginTop: 14,
					width: 520 * e,
					marginLeft: lado === 'dir' ? 'auto' : 0,
					background: OURO,
					boxShadow: '0 0 20px rgba(255,170,60,0.8)',
				}}
			/>
		</div>
	);
};

const Cena3: React.FC<{t: number}> = ({t}) => {
	const l = t - 9.4;
	const p = interpolate(l, [0, 7.4], [0, 1], clamp);
	const encontro = interpolate(t, [15.7, 15.9, 16.6], [0, 1, 0.3], clamp);
	return (
		<AbsoluteFill>
			<Camada src="noir/cena3.jpg" escala={1.3 + p * 0.08} x={interpolate(p, [0, 1], [140, -140])} origem="55% 60%" />
			<AbsoluteFill
				style={{
					background: 'radial-gradient(circle at 58% 66%, rgba(255,230,160,1), transparent 30%)',
					opacity: encontro,
					mixBlendMode: 'screen',
				}}
			/>
			<Zona texto="ZONA NORTE" t={t} de={13.84} lado="esq" />
			<Zona texto="ZONA SUL" t={t} de={15.56} lado="dir" />
		</AbsoluteFill>
	);
};

const NOMES = [
	{nome: 'KL JAY', x: 0.335, alto: false, s: 17.02},
	{nome: 'ICE BLUE', x: 0.44, alto: true, s: 17.42},
	{nome: 'MANO BROWN', x: 0.555, alto: false, s: 18.66},
	{nome: 'EDI ROCK', x: 0.665, alto: true, s: 19.4},
];

const Cena4: React.FC<{t: number}> = ({t}) => {
	const l = t - 16.8;
	const escala = 1.04 + interpolate(l, [0, 3.35], [0, 0.08], clamp);
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${escala})`, transformOrigin: '50% 55%'}}>
				<Img src={staticFile('noir/cena4.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
				{NOMES.map((n) => {
					const e = interpolate(t, [n.s, n.s + 0.25], [0, 1], suave);
					if (e <= 0) return null;
					const topo = n.alto ? 200 : 290;
					return (
						<div
							key={n.nome}
							style={{
								position: 'absolute',
								left: n.x * 1920,
								top: topo,
								transform: `translate(-50%, ${(1 - e) * 25}px)`,
								opacity: e,
								textAlign: 'center',
							}}
						>
							<div
								style={{
									fontFamily: 'Bebas',
									fontSize: 64,
									letterSpacing: 4,
									color: '#ffe9b8',
									textShadow: '4px 4px 0 #1a0505, 0 0 18px rgba(255,170,60,0.7)',
									whiteSpace: 'nowrap',
								}}
							>
								{n.nome}
							</div>
							<div style={{width: 3, height: 470 - topo - 60, margin: '4px auto 0', background: OURO, opacity: 0.8}} />
						</div>
					);
				})}
			</AbsoluteFill>
			<Chuva t={t} intensidade={0.6} />
		</AbsoluteFill>
	);
};

const Cena5: React.FC<{t: number}> = ({t}) => {
	const l = t - 20.15;
	const p = interpolate(l, [0, 2.85], [0, 1], clamp);
	const titulo = interpolate(l, [0.05, 0.3], [0, 1], suave);
	return (
		<AbsoluteFill>
			<Camada src="noir/cena5.jpg" escala={1.04 + p * 0.05} origem="42% 30%" desfoque={3} />
			<Camada src="noir/cena5_recorte.png" escala={1.04 + p * 0.1} origem="42% 30%" />
			<div
				style={{
					position: 'absolute',
					right: 110,
					top: 230,
					textAlign: 'center',
					opacity: titulo,
					transform: `scale(${interpolate(titulo, [0, 1], [1.4, 1])})`,
				}}
			>
				<div style={textoOuro(150)}>RACIONAIS</div>
				<div style={{...textoOuro(150), marginTop: 10}}>MC&apos;S</div>
			</div>
		</AbsoluteFill>
	);
};

const Legenda: React.FC<{t: number}> = ({t}) => {
	const fala = falas.find((f) => t >= f.de && t <= f.ate);
	if (!fala) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				bottom: 0,
				height: BARRA,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: 'Bebas',
				fontSize: 50,
				letterSpacing: 2,
			}}
		>
			{fala.palavras.map((p, i) => {
				const atual = t >= p.s && t < (fala.palavras[i + 1]?.s ?? fala.ate);
				return (
					<span key={i} style={{marginRight: 14, color: atual ? '#f2c45a' : t >= p.s ? '#f4ead8' : '#5e5550'}}>
						{p.w.toUpperCase()}
					</span>
				);
			})}
		</div>
	);
};

export const Noir: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;

	const cena = CORTES.findIndex((c, i) => t >= c && t < (CORTES[i + 1] ?? 99));
	const Cenas = [Cena1, Cena2, Cena3, Cena4, Cena5];
	const Atual = Cenas[Math.min(cena, 4)];

	// Flash e tremor nos cortes e impactos.
	const desdeCorte = t - CORTES[Math.min(cena, 4)];
	const flash = cena > 0 ? interpolate(desdeCorte, [0, 0.2], [0.7, 0], clamp) : 0;
	const imp = IMPACTOS.map((s) => t - s).find((d) => d >= 0 && d < 0.35);
	const tremor = imp !== undefined ? (1 - imp / 0.35) * 14 : 0;
	const tx = (random(`tx-${frame}`) - 0.5) * tremor;
	const ty = (random(`ty-${frame}`) - 0.5) * tremor;
	const abre = interpolate(t, [0, 0.6], [0, 1], clamp);
	const fecha = interpolate(t, [22.2, 23], [1, 0], clamp);

	return (
		<AbsoluteFill style={{background: '#000'}}>
			<AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px)`, opacity: Math.min(abre, fecha)}}>
				<Atual t={t} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: '#fff3d6', opacity: flash, mixBlendMode: 'screen'}} />
			<Granulado frame={frame} />
			<AbsoluteFill
				style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(20,0,0,0.7) 100%)'}}
			/>
			{/* Barras de cinema */}
			<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: BARRA, background: '#050303'}} />
			<div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: BARRA, background: '#050303'}} />
			<Legenda t={t} />
			<div
				style={{
					position: 'absolute',
					top: 38,
					right: 56,
					fontFamily: 'Limelight',
					fontSize: 34,
					color: '#c9973a',
					opacity: 0.85,
				}}
			>
				LADO B
			</div>

			<Audio src={staticFile('narracao.wav')} />
			<Audio src={staticFile('noir_trilha.wav')} volume={0.2} />
			{CORTES.slice(1, 4).map((c) => (
				<Sequence key={c} from={Math.round((c - 0.3) * fps)} durationInFrames={20}>
					<Audio src={staticFile('noir_whoosh.wav')} volume={0.45} />
				</Sequence>
			))}
			{IMPACTOS.map((s) => (
				<Sequence key={s} from={Math.round(s * fps)} durationInFrames={50}>
					<Audio src={staticFile('noir_impacto.wav')} volume={0.4} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
