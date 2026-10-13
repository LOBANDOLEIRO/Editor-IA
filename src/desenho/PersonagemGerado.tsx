import {loadFont} from '@remotion/fonts';
import {useAudioData} from '@remotion/media-utils';
import {AbsoluteFill, Audio, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Teste de 10s com o personagem gerado (imagem do Runway recortada) animado
// no Remotion: mandíbula que abre com a voz, piscadas, respiração e paralaxe.

loadFont({family: 'Limelight', url: staticFile('Limelight-Regular.ttf')});

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const VOZ = staticFile('desenho/voz.wav');
const CORTE = 3.35;

const useBoca = (t: number) => {
	const audio = useAudioData(VOZ);
	if (!audio) return 0;
	const c = audio.channelWaveforms[0];
	const i0 = Math.floor(t * audio.sampleRate);
	const i1 = Math.min(c.length, i0 + Math.floor(audio.sampleRate / 30));
	let s = 0;
	for (let i = i0; i < i1; i++) s += c[i] * c[i];
	return interpolate(Math.sqrt(s / Math.max(1, i1 - i0)), [0.02, 0.18], [0, 1], clamp);
};

// Pontos do rosto na imagem cena1_recorte.png (1920x1072).
const MANDIBULA = '866,384 930,384 966,420 972,462 950,492 900,510 850,492 828,462 834,420';
const BOCA = {x: 897, y: 384};
const OLHOS = [
	{x: 860, y: 312, rx: 20, pele: '#7a3f2b'},
	{x: 936, y: 298, rx: 21, pele: '#7a3f2b'},
];

const Plano1: React.FC<{t: number; boca: number}> = ({t, boca}) => {
	const p = t / CORTE;
	const piscar = [1.1, 2.9].some((b) => t > b && t < b + 0.12);
	const resp = 1 + Math.sin(t * 2.2) * 0.004;
	const abre = boca * 7;
	const pisca = random(`poste-${Math.floor(t * 12)}`) < 0.08 ? 0.55 : 1;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${1.06 + p * 0.05})`, transformOrigin: '47% 30%'}}>
				<Img src={staticFile('noir/cena1.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(3px)'}} />
			</AbsoluteFill>
			<svg
				viewBox="0 0 1920 1072"
				width={1920}
				height={1080}
				preserveAspectRatio="xMidYMid slice"
				style={{position: 'absolute', transform: `scale(${1.06 + p * 0.1})`, transformOrigin: '47% 30%'}}
			>
				<defs>
					<clipPath id="mandibula">
						<polygon points={MANDIBULA} />
					</clipPath>
				</defs>
				<g transform={`translate(0 ${1072 * (1 - resp)}) scale(1 ${resp})`}>
					<image href={staticFile('noir/cena1_recorte.png')} width={1920} height={1072} />
					{/* Boca aberta por baixo da mandíbula */}
					<ellipse cx={BOCA.x} cy={BOCA.y + abre / 2} rx={30} ry={1 + abre / 1.6} fill="#2a0a08" />
					<g transform={`translate(0 ${abre})`}>
						<image href={staticFile('noir/cena1_recorte.png')} width={1920} height={1072} clipPath="url(#mandibula)" />
					</g>
					{piscar
						? OLHOS.map((o) => (
								<g key={o.x}>
									<ellipse cx={o.x} cy={o.y} rx={o.rx} ry={9} fill={o.pele} />
									<path d={`M ${o.x - o.rx} ${o.y + 2} Q ${o.x} ${o.y + 8} ${o.x + o.rx} ${o.y + 2}`} stroke="#160b08" strokeWidth={3.5} fill="none" />
								</g>
							))
						: null}
				</g>
			</svg>
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse at 37% 5%, rgba(255,200,110,0.3), transparent 45%)',
					opacity: pisca,
					mixBlendMode: 'screen',
				}}
			/>
		</AbsoluteFill>
	);
};

const Plano2: React.FC<{t: number}> = ({t}) => {
	const l = t - CORTE;
	const p = l / (10 - CORTE);
	const resp = 1 + Math.sin(t * 2) * 0.005;
	const titulo = interpolate(t, [6.9, 7.4], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${1.03 + p * 0.04})`, transformOrigin: '42% 30%'}}>
				<Img src={staticFile('noir/cena5.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2.5px)'}} />
			</AbsoluteFill>
			<svg width={1920} height={1080} style={{position: 'absolute', mixBlendMode: 'screen'}}>
				{[0, 1, 2].map((i) => (
					<polygon
						key={i}
						points="0,0 -60,-1300 60,-1300"
						fill="#ffffff"
						opacity={0.1}
						transform={`translate(${380 + i * 600} 1000) rotate(${Math.sin(t * 0.9 + i * 2) * 20 + (i - 1) * 22})`}
					/>
				))}
			</svg>
			<AbsoluteFill
				style={{transform: `scale(${1.03 + p * 0.09}) scaleY(${resp})`, transformOrigin: '42% 95%'}}
			>
				<Img src={staticFile('noir/cena5_recorte.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			</AbsoluteFill>
			<div
				style={{
					position: 'absolute',
					right: 110,
					top: 300,
					textAlign: 'center',
					opacity: titulo,
					transform: `scale(${interpolate(titulo, [0, 1], [1.3, 1])})`,
				}}
			>
				<div
					style={{
						fontFamily: 'Limelight',
						fontSize: 116,
						lineHeight: 1,
						background: 'linear-gradient(180deg, #fff1b8 0%, #f2c45a 45%, #a8701c 100%)',
						WebkitBackgroundClip: 'text',
						color: 'transparent',
						filter: 'drop-shadow(6px 6px 0 #1a0505) drop-shadow(0 0 30px rgba(255,170,60,0.45))',
					}}
				>
					LOBANDOLEIRO
				</div>
				<div style={{fontFamily: 'Limelight', fontSize: 42, color: '#ffe3b0', marginTop: 16, letterSpacing: 8}}>O VIAJANTE DO TEMPO</div>
			</div>
		</AbsoluteFill>
	);
};

export const PersonagemGerado: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const boca = useBoca(t);
	const flash = interpolate(t, [CORTE, CORTE + 0.2], [0.7, 0], clamp);
	const fade = Math.min(interpolate(t, [0, 0.4], [0, 1], clamp), interpolate(t, [9.4, 10], [1, 0], clamp));
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<AbsoluteFill style={{opacity: fade}}>
				{t < CORTE ? <Plano1 t={t} boca={boca} /> : <Plano2 t={t} />}
			</AbsoluteFill>
			<AbsoluteFill style={{background: '#fff3d6', opacity: t >= CORTE ? flash : 0, mixBlendMode: 'screen'}} />
			<AbsoluteFill style={{opacity: 0.15, mixBlendMode: 'overlay'}}>
				<svg width={1920} height={1080}>
					<filter id={`g${frame % 6}`}>
						<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 6} />
					</filter>
					<rect width="100%" height="100%" filter={`url(#g${frame % 6})`} />
				</svg>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(20,0,0,0.7) 100%)'}} />
			<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: '#050303'}} />
			<div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: '#050303'}} />
			<Audio src={VOZ} volume={(f) => (f < 7 * fps ? 1 : 0)} />
			<Audio src={staticFile('noir_trilha.wav')} volume={0.3} />
		</AbsoluteFill>
	);
};
