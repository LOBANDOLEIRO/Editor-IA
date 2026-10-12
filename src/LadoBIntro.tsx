import {loadFont} from '@remotion/fonts';
import {useAudioData} from '@remotion/media-utils';
import {ThreeCanvas} from '@remotion/three';
import {
	AbsoluteFill,
	Audio,
	Easing,
	Sequence,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {INICIO_VOZ, falas} from './falas';
import {Expressao, Personagem} from './Personagem';
import {TV} from './TV';

const fontFamily = 'PressStart2P';
loadFont({family: fontFamily, url: staticFile('PressStart2P.ttf')});

// Resolução interna do 3D (tipo 480p de PS2), ampliada sem suavizar.
const BAIXA_W = 854;
const BAIXA_H = 480;

const VOZ = staticFile('voz.wav');

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Volume da voz no frame (RMS), usado para abrir a boca.
const useVolume = (frameVoz: number) => {
	const audio = useAudioData(VOZ);
	const {fps} = useVideoConfig();
	if (!audio || frameVoz < 0) return 0;
	const canal = audio.channelWaveforms[0];
	const ini = Math.floor((frameVoz / fps) * audio.sampleRate);
	const fim = Math.min(canal.length, Math.floor(((frameVoz + 1) / fps) * audio.sampleRate));
	if (ini >= fim) return 0;
	let soma = 0;
	for (let i = ini; i < fim; i++) soma += canal[i] * canal[i];
	return Math.sqrt(soma / (fim - ini));
};

const PISCADAS = [62, 128, 182, 226, 258];

const Cena3D: React.FC<{expressao: Expressao}> = ({expressao}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Entrada: a TV cai do alto e quica.
	const queda = spring({frame, fps, config: {damping: 9, mass: 0.7}});
	const y = interpolate(queda, [0, 1], [5, 0.05]);

	// Fim da fala: TV vai para a esquerda para dar espaço ao "inscreva-se".
	const lado = interpolate(frame, [196, 216], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const x = interpolate(lado, [0, 1], [0, -2.5]);

	const flutua = Math.sin(frame * 0.06) * 0.06;
	const giro = Math.sin(frame * 0.025) * 0.12 + lado * 0.35;

	// Liga (frames 18-40) e desliga (274+).
	const desligada =
		frame < 20 ? 1 : frame >= 274 ? 1 : interpolate(frame, [20, 25], [1, 0], clamp);
	const flash =
		frame >= 274
			? interpolate(frame, [274, 282], [1, 0], clamp)
			: frame >= 20 && frame < 26
				? interpolate(frame, [20, 23], [0.05, 1], clamp)
				: 0;
	const chuvisco = interpolate(frame, [22, 30, 42], [1, 0.9, 0.07], clamp);

	const e = expressao;
	const cabeca = {
		ry: Math.sin(frame * 0.045) * 0.16 + lado * 0.25,
		rx: e.boca * 0.06 + Math.sin(frame * 0.07) * 0.03 - 0.04,
		rz: Math.sin(frame * 0.03) * 0.04,
	};

	return (
		<>
			<fog attach="fog" args={['#07050c', 9, 24]} />
			<ambientLight intensity={0.7} />
			<directionalLight position={[2.5, 3, 7]} intensity={1.3} />
			<directionalLight position={[-5, 2, -4]} intensity={1.4} color="#a050ff" />

			<gridHelper args={[60, 40, '#7a33c4', '#3a1a5e']} position={[0, -1.75, 0]} />
			{[
				[-5.5, 2.2, -6, '#36e0ff'],
				[5.8, 1.4, -7, '#ff3fa0'],
				[4.2, -0.6, -3.5, '#ffd23f'],
				[-4.6, -0.4, -4, '#7a33c4'],
			].map(([px, py, pz, cor], i) => (
				<mesh
					key={i}
					position={[px as number, (py as number) + Math.sin(frame * 0.04 + i) * 0.2, pz as number]}
					rotation={[frame * 0.02 * (i + 1), frame * 0.03, 0]}
				>
					<octahedronGeometry args={[0.5, 0]} />
					<meshBasicMaterial color={cor as string} wireframe />
				</mesh>
			))}

			<group position={[x, y + flutua, 0]} rotation={[0.04, giro, Math.sin(frame * 0.05) * 0.02]}>
				<TV desligada={desligada} chuvisco={chuvisco} flash={flash}>
					<group position={[0, 0.02, 0.1]} rotation={[cabeca.rx, cabeca.ry, cabeca.rz]} scale={0.7}>
						<Personagem e={e} />
					</group>
				</TV>
			</group>
		</>
	);
};

const CaixaDialogo: React.FC<{frameVoz: number}> = ({frameVoz}) => {
	const frame = useCurrentFrame();
	const abre = interpolate(frame, [INICIO_VOZ - 6, INICIO_VOZ], [0, 1], clamp);
	const fecha = interpolate(frame, [198, 206], [1, 0], clamp);
	const escala = Math.min(abre, fecha);
	if (escala <= 0) return null;

	const atual = [...falas].reverse().find((f) => frameVoz >= f.de) ?? falas[0];
	const dur = atual.ate - atual.de;
	const letras = Math.floor(interpolate(frameVoz, [atual.de, atual.de + dur * 0.8], [0, atual.texto.length], clamp));
	const terminou = letras >= atual.texto.length;

	return (
		<div
			style={{
				position: 'absolute',
				left: 160,
				right: 160,
				bottom: 50,
				height: 170,
				transform: `scaleY(${escala})`,
				background: 'linear-gradient(#141a5c, #070a2e)',
				border: '8px solid #f4f4f4',
				outline: '6px solid #070a2e',
				borderRadius: 14,
				boxShadow: '0 0 0 14px #f4f4f455',
				padding: '52px 46px 0',
				fontFamily,
				color: '#fff',
				fontSize: 44,
				letterSpacing: 2,
				textShadow: '4px 4px 0 #000',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: -34,
					left: 36,
					background: '#d42a2a',
					border: '6px solid #f4f4f4',
					padding: '12px 22px',
					fontSize: 26,
				}}
			>
				LOBANDOLEIRO
			</div>
			{atual.texto.slice(0, letras)}
			{terminou && Math.floor(frame / 8) % 2 === 0 ? (
				<div
					style={{
						position: 'absolute',
						right: 40,
						bottom: 24,
						width: 0,
						height: 0,
						borderLeft: '16px solid transparent',
						borderRight: '16px solid transparent',
						borderTop: '20px solid #ffd23f',
					}}
				/>
			) : null}
		</div>
	);
};

const Inscrevase: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const entra = spring({frame: frame - 200, fps, config: {damping: 10}});
	if (frame < 200) return null;

	const clicou = frame >= 238;
	const pulo = clicou ? spring({frame: frame - 238, fps, config: {damping: 6, stiffness: 300}}) : 0;
	const cursor = interpolate(frame, [222, 236], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});

	return (
		<div
			style={{
				position: 'absolute',
				right: 120,
				top: 250,
				width: 820,
				textAlign: 'center',
				fontFamily,
				color: '#fff',
				transform: `translateX(${(1 - entra) * 900}px)`,
			}}
		>
			<div style={{fontSize: 34, color: '#36e0ff', textShadow: '4px 4px 0 #000', letterSpacing: 4}}>
				CANAL
			</div>
			<div
				style={{
					fontSize: 132,
					marginTop: 20,
					lineHeight: 1,
					color: '#ffd23f',
					textShadow: '8px 8px 0 #d42a2a, 14px 14px 0 #000',
				}}
			>
				LADO B
			</div>
			<div
				style={{
					position: 'relative',
					display: 'inline-block',
					marginTop: 90,
					padding: '34px 46px',
					fontSize: 46,
					background: clicou ? '#5b5b66' : '#d42a2a',
					border: '8px solid #fff',
					boxShadow: '10px 10px 0 #000',
					transform: `scale(${1 + Math.sin(frame * 0.25) * (clicou ? 0 : 0.04) + pulo * 0.06 - (clicou ? 0.06 : 0)})`,
				}}
			>
				{clicou ? 'INSCRITO!' : 'INSCREVA-SE'}
				{/* Cursor pixelado que clica no botão */}
				<div
					style={{
						position: 'absolute',
						left: interpolate(cursor, [0, 1], [700, 330]),
						top: interpolate(cursor, [0, 1], [260, 70]),
						width: 0,
						height: 0,
						borderLeft: '24px solid #fff',
						borderTop: '12px solid transparent',
						borderBottom: '30px solid transparent',
						filter: 'drop-shadow(4px 4px 0 #000)',
						transform: `rotate(-25deg) scale(${frame >= 236 && frame < 241 ? 0.8 : 1})`,
					}}
				/>
			</div>
			<div
				style={{
					marginTop: 60,
					fontSize: 28,
					color: '#fff',
					opacity: Math.floor(frame / 10) % 2 === 0 ? 1 : 0.15,
					textShadow: '4px 4px 0 #000',
				}}
			>
				&gt; ATIVE O SININHO &lt;
			</div>
		</div>
	);
};

export const LadoBIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const frameVoz = frame - INICIO_VOZ;

	// Média de 2 frames para a boca não tremer.
	const v1 = useVolume(frameVoz);
	const v0 = useVolume(frameVoz - 1);
	const boca = interpolate((v0 + v1 * 2) / 3, [0.015, 0.12], [0, 1], clamp);

	const fala = (de: number, ate: number) => (frameVoz >= de && frameVoz <= ate ? 1 : 0);
	const sobrancelha = Math.max(
		interpolate(frameVoz, [-4, 4, 22, 30], [0, 1, 1, 0], clamp),
		interpolate(frameVoz, [95, 100, 112, 118], [0, 1, 1, 0], clamp),
		interpolate(frameVoz, [120, 126, 146, 154], [0, 1, 1, 0], clamp) * fala(115, 160),
	);
	const piscada = Math.max(...PISCADAS.map((p) => interpolate(frame, [p, p + 2, p + 4], [0, 1, 0], clamp)));

	const expressao: Expressao = {
		boca,
		sobrancelha,
		piscada,
		olharX: Math.sin(frame * 0.05) * 0.5,
		balancoRabo: Math.sin(frame * 0.12) * 0.15 + boca * 0.05,
	};

	// Desliga o "tubo" inteiro no final.
	const sy = interpolate(frame, [284, 290], [1, 0.006], clamp);
	const sx = interpolate(frame, [290, 296], [1, 0], clamp);
	const brilho = interpolate(frame, [284, 290], [1, 3], clamp);

	return (
		<AbsoluteFill style={{background: '#000'}}>
			<AbsoluteFill
				style={{
					transform: `scale(${sx}, ${sy})`,
					filter: `brightness(${brilho})`,
					background: 'radial-gradient(ellipse at 50% 40%, #1d1036 0%, #07050c 70%)',
				}}
			>
				<div
					style={{
						width: BAIXA_W,
						height: BAIXA_H,
						transform: `scale(${1920 / BAIXA_W})`,
						transformOrigin: '0 0',
						imageRendering: 'pixelated',
					}}
				>
					<ThreeCanvas
						width={BAIXA_W}
						height={BAIXA_H}
						dpr={1}
						gl={{antialias: false}}
						camera={{fov: 32, position: [0, 0.2, 10.5]}}
					>
						<Cena3D expressao={expressao} />
					</ThreeCanvas>
				</div>

				<CaixaDialogo frameVoz={frameVoz} />
				<Inscrevase />

				{/* Selo do canal no canto */}
				<div
					style={{
						position: 'absolute',
						top: 46,
						left: 56,
						fontFamily,
						fontSize: 26,
						color: '#ffd23f',
						textShadow: '4px 4px 0 #d42a2a',
						opacity: interpolate(frame, [40, 50], [0, 0.9], clamp),
					}}
				>
					LADO B
				</div>

				{/* Scanlines e vinheta de TV de tubo */}
				<AbsoluteFill
					style={{
						background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 5px)',
						pointerEvents: 'none',
					}}
				/>
				<AbsoluteFill
					style={{
						background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)',
					}}
				/>
			</AbsoluteFill>

			<Sequence from={INICIO_VOZ}>
				<Audio src={VOZ} />
			</Sequence>
			<Sequence from={18} durationInFrames={20}>
				<Audio src={staticFile('sfx_static.wav')} volume={0.5} />
			</Sequence>
			<Sequence from={162} durationInFrames={20}>
				<Audio src={staticFile('sfx_coin.wav')} volume={0.4} />
			</Sequence>
			<Sequence from={200} durationInFrames={30}>
				<Audio src={staticFile('sfx_jingle.wav')} volume={0.45} />
			</Sequence>
			<Sequence from={238} durationInFrames={20}>
				<Audio src={staticFile('sfx_coin.wav')} volume={0.5} />
			</Sequence>
			<Sequence from={274} durationInFrames={20}>
				<Audio src={staticFile('sfx_off.wav')} volume={0.5} />
			</Sequence>
		</AbsoluteFill>
	);
};
