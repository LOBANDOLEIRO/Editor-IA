import {loadFont} from '@remotion/fonts';
import {useAudioData} from '@remotion/media-utils';
import {
	AbsoluteFill,
	Audio,
	Easing,
	Img,
	interpolate,
	random,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {Lobandoleiro, POSE_LOBA} from './Personagens';

// Teste de 5s: fundo pintado (imagem do Runway já gerada) + personagem
// vetorial animado por cima, com luz noir (sombra chapada e luz de recorte).

loadFont({family: 'Limelight', url: staticFile('Limelight-Regular.ttf')});

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const VOZ = staticFile('desenho/voz.wav');

const useBoca = (t: number) => {
	const audio = useAudioData(VOZ);
	if (!audio || t > 3.2) return 0;
	const c = audio.channelWaveforms[0];
	const i0 = Math.floor(t * audio.sampleRate);
	const i1 = Math.min(c.length, i0 + Math.floor(audio.sampleRate / 30));
	let s = 0;
	for (let i = i0; i < i1; i++) s += c[i] * c[i];
	return interpolate(Math.sqrt(s / Math.max(1, i1 - i0)), [0.02, 0.18], [0, 1], clamp);
};

// Filtro noir: escurece tudo puxando pro vermelho e acende uma borda âmbar
// do lado de onde vem a luz.
const FiltroNoir: React.FC = () => (
	<defs>
		<filter id="noir" x="-10%" y="-10%" width="120%" height="120%">
			<feColorMatrix
				in="SourceGraphic"
				type="matrix"
				values="0.6 0.05 0 0 0.02  0.02 0.36 0 0 0  0 0 0.3 0 0  0 0 0 1 0"
				result="mat"
			/>
			<feComponentTransfer in="mat" result="escuro">
				<feFuncR type="gamma" amplitude={1.1} exponent={1.7} offset={0} />
				<feFuncG type="gamma" amplitude={1.1} exponent={1.7} offset={0} />
				<feFuncB type="gamma" amplitude={1.1} exponent={1.7} offset={0} />
			</feComponentTransfer>
			<feOffset in="SourceAlpha" dx="-12" dy="8" result="desl" />
			<feComposite in="SourceAlpha" in2="desl" operator="out" result="borda" />
			<feFlood floodColor="#ffb347" result="cor" />
			<feComposite in="cor" in2="borda" operator="in" result="luz" />
			<feGaussianBlur in="luz" stdDeviation="1.2" result="luzSuave" />
			<feMerge>
				<feMergeNode in="escuro" />
				<feMergeNode in="luzSuave" />
			</feMerge>
		</filter>
	</defs>
);

export const DecoDemo: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const boca = useBoca(t);
	const z = interpolate(t, [0, 5], [1.12, 1.22]);
	const titulo = interpolate(t, [3.2, 3.6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const pisca = random(`pisca-${Math.floor(t * 10)}`) < 0.07 ? 0.6 : 1;
	const fade = Math.min(interpolate(t, [0, 0.5], [0, 1], clamp), interpolate(t, [4.5, 5], [1, 0], clamp));

	const pose = {
		...POSE_LOBA,
		bracoE: {ombro: interpolate(t, [0.3, 0.7, 2.8, 3.2], [12, 150, 150, 14], clamp), cotovelo: -30 + Math.sin(t * 12) * 22 * (t > 0.6 && t < 2.9 ? 1 : 0)},
		bracoD: {ombro: interpolate(t, [3.0, 3.5], [12, 70], clamp), cotovelo: interpolate(t, [3.0, 3.5], [-8, -105], clamp)},
		boca,
		piscar: t % 2.6 > 2.45 ? 1 : 0,
		sobrancelha: t < 1.2 ? 1 : 0,
		cabeca: Math.sin(t * 2) * 3,
		balanco: Math.sin(t * 4) * 4,
		rabo: Math.sin(t * 3) * 8 + 10,
		discoGiro: t * (t > 3.3 ? 900 : 80),
		discoBrilho: interpolate(t, [3.3, 4.2], [0, 1], clamp),
	};

	return (
		<AbsoluteFill style={{background: '#000', opacity: fade}}>
			{/* Fundo pintado com zoom lento */}
			<AbsoluteFill style={{transform: `scale(${z * 1.25}) translateX(${-t * 8}px)`, transformOrigin: '60% 55%'}}>
				<Img src={staticFile('noir/cena3.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(1.5px)'}} />
			</AbsoluteFill>
			{/* Holofotes varrendo o céu */}
			<svg width={1920} height={1080} style={{position: 'absolute', mixBlendMode: 'screen'}}>
				{[0, 1, 2].map((i) => {
					const a = Math.sin(t * 0.8 + i * 2) * 18 + (i - 1) * 25;
					return (
						<polygon
							key={i}
							points="0,0 -70,-1300 70,-1300"
							fill="#ffe6b0"
							opacity={0.12}
							transform={`translate(${500 + i * 520} 900) rotate(${a})`}
						/>
					);
				})}
			</svg>
			{/* Personagem e parapeito art déco em primeiro plano */}
			<svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute'}}>
				<FiltroNoir />
				<g filter="url(#noir)" opacity={pisca > 0.8 ? 1 : 0.92}>
					<Lobandoleiro p={pose} x={600} y={1000} escala={0.84} />
				</g>
				<g fill="#0a0506">
					<rect x={0} y={985} width={1920} height={95} />
					{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
						<path key={i} d={`M ${i * 260 + 60} 985 l 40 -40 h 100 l 40 40 z`} />
					))}
				</g>
				<rect x={0} y={984} width={1920} height={4} fill="#ffb347" opacity={0.7} />
				{/* Chuva */}
				{new Array(120).fill(0).map((_, i) => {
					const x0 = random(`r-x-${i}`) * 2100;
					const y = ((random(`r-y-${i}`) * 1300 + t * (1600 + random(`r-v-${i}`) * 800)) % 1300) - 150;
					return <line key={i} x1={x0 - (y + 150) * 0.18} y1={y} x2={x0 - (y + 150) * 0.18 - 9} y2={y + 46} stroke="#ffd9a8" strokeWidth={1.6} opacity={0.35} />;
				})}
			</svg>
			{/* Título dourado */}
			<div
				style={{
					position: 'absolute',
					right: 120,
					top: 260,
					textAlign: 'center',
					opacity: titulo,
					transform: `scale(${interpolate(titulo, [0, 1], [1.3, 1])})`,
				}}
			>
				<div
					style={{
						fontFamily: 'Limelight',
						fontSize: 120,
						lineHeight: 1,
						background: 'linear-gradient(180deg, #fff1b8 0%, #f2c45a 45%, #a8701c 100%)',
						WebkitBackgroundClip: 'text',
						color: 'transparent',
						filter: 'drop-shadow(6px 6px 0 #1a0505) drop-shadow(0 0 30px rgba(255,170,60,0.45))',
					}}
				>
					LOBANDOLEIRO
				</div>
				<div style={{fontFamily: 'Limelight', fontSize: 44, color: '#ffe3b0', marginTop: 16, letterSpacing: 8}}>
					O VIAJANTE DO TEMPO
				</div>
			</div>
			{/* Granulado, vinheta e barras de cinema */}
			<AbsoluteFill style={{opacity: 0.15, mixBlendMode: 'overlay'}}>
				<svg width={1920} height={1080}>
					<filter id={`g${frame % 6}`}>
						<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 6} />
					</filter>
					<rect width="100%" height="100%" filter={`url(#g${frame % 6})`} />
				</svg>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(20,0,0,0.75) 100%)'}} />
			<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: '#050303'}} />
			<div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: '#050303'}} />

			<Audio src={VOZ} volume={(f) => (f < 3.25 * fps ? 1 : 0)} />
			<Audio src={staticFile('noir_trilha.wav')} volume={0.3} />
		</AbsoluteFill>
	);
};
