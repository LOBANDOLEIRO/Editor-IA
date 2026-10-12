import {useMemo} from 'react';
import {random} from 'remotion';
import * as THREE from 'three';

// Lobandoleiro em low-poly estilo PS2: tudo feito de primitivas com poucos
// segmentos e flatShading, para as facetas aparecerem.

const PELE = '#6e4632';
const PELE_FADE = '#4a3127';
const CABELO = '#141010';
const BARBA = '#1a1414';
const TATTOO = '#22150f';
const LABIO = '#5a362d';
const CAMISA = '#101012';

const Mat: React.FC<{cor: string}> = ({cor}) => (
	<meshLambertMaterial color={cor} flatShading />
);

export type Expressao = {
	boca: number; // 0 = fechada, 1 = aberta
	sobrancelha: number; // 0 = neutra, 1 = levantada
	piscada: number; // 0 = aberto, 1 = fechado
	olharX: number; // -1..1
	balancoRabo: number; // radianos
};

// Barba com alguns fios brancos espalhados (cores por vértice).
const useBarba = () =>
	useMemo(() => {
		const g = new THREE.SphereGeometry(0.52, 9, 6).toNonIndexed();
		const cores: number[] = [];
		const escuro = new THREE.Color(BARBA);
		const cinza = new THREE.Color('#8d8a86');
		const n = g.attributes.position.count;
		for (let face = 0; face < n / 3; face++) {
			const c = random(`barba-${face}`) < 0.05 ? cinza : escuro;
			for (let v = 0; v < 3; v++) cores.push(c.r, c.g, c.b);
		}
		g.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
		return g;
	}, []);

const Olho: React.FC<{x: number; e: Expressao}> = ({x, e}) => {
	const abertura = Math.max(0.08, 1 - e.piscada);
	return (
		<group position={[x, 0.08, 0.86]} scale={[1, abertura, 1]}>
			<mesh scale={[1.25, 0.72, 0.5]}>
				<sphereGeometry args={[0.13, 7, 5]} />
				<Mat cor="#e9e1d6" />
			</mesh>
			<mesh position={[e.olharX * 0.05, -0.005, 0.055]}>
				<sphereGeometry args={[0.068, 6, 5]} />
				<Mat cor="#1b0f0a" />
			</mesh>
		</group>
	);
};

const Sobrancelha: React.FC<{x: number; e: Expressao}> = ({x, e}) => {
	const lado = Math.sign(x);
	return (
		<mesh
			position={[x, 0.3 + e.sobrancelha * 0.09, 0.9]}
			rotation={[0.15, -lado * 0.25, -lado * (0.06 + e.sobrancelha * 0.12)]}
		>
			<boxGeometry args={[0.44, 0.1, 0.12]} />
			<Mat cor={CABELO} />
		</mesh>
	);
};

const Ankh: React.FC = () => (
	// Tatuagem de ankh na têmpora esquerda (lado direito da tela).
	<group position={[0.8, 0.22, 0.62]} rotation={[0, 0.95, 0]} scale={0.6}>
		<mesh position={[0, 0.16, 0]}>
			<torusGeometry args={[0.07, 0.022, 4, 8]} />
			<meshBasicMaterial color={TATTOO} />
		</mesh>
		<mesh position={[0, -0.08, 0]}>
			<boxGeometry args={[0.04, 0.32, 0.02]} />
			<meshBasicMaterial color={TATTOO} />
		</mesh>
		<mesh position={[0, 0.06, 0]}>
			<boxGeometry args={[0.24, 0.04, 0.02]} />
			<meshBasicMaterial color={TATTOO} />
		</mesh>
	</group>
);

// Locs presos atrás num rabinho, balançando.
const Rabo: React.FC<{balanco: number}> = ({balanco}) => {
	const locs = [
		[-0.16, 0.0, 0.2],
		[-0.06, 0.05, 0.05],
		[0.06, 0.04, -0.06],
		[0.16, 0.0, -0.2],
		[-0.1, -0.06, 0.12],
		[0.1, -0.05, -0.1],
	];
	return (
		<group position={[0, 0.72, -0.72]} rotation={[-0.9 + balanco * 0.3, balanco, 0]}>
			<mesh rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.15, 0.05, 4, 8]} />
				<Mat cor="#050505" />
			</mesh>
			{locs.map(([x, z, rz], i) => (
				<mesh
					key={i}
					position={[x, -0.42, z]}
					rotation={[0.25 + i * 0.05, 0, rz + balanco * 0.4]}
				>
					<cylinderGeometry args={[0.065, 0.045, 0.85, 5]} />
					<Mat cor={CABELO} />
				</mesh>
			))}
		</group>
	);
};

// Tatuagens do pescoço: barras de letra gótica + estrela.
const TattooPescoco: React.FC = () => {
	const barras = [-0.38, -0.22, -0.07, 0.08, 0.23, 0.38];
	return (
		<group>
			{barras.map((x, i) => (
				<mesh
					key={i}
					position={[x, -1.2 + (i % 2) * 0.04, 0.6 - Math.abs(x) * 0.35]}
					rotation={[0, x * 0.9, 0]}
				>
					<boxGeometry args={[0.06, 0.38 + (i % 3) * 0.06, 0.02]} />
					<meshBasicMaterial color={TATTOO} />
				</mesh>
			))}
			<mesh position={[0, -1.47, 0.62]} rotation={[0, 0, Math.PI / 4]}>
				<boxGeometry args={[0.1, 0.1, 0.02]} />
				<meshBasicMaterial color={TATTOO} />
			</mesh>
		</group>
	);
};

export const Personagem: React.FC<{e: Expressao}> = ({e}) => {
	const barba = useBarba();
	const abre = e.boca;

	return (
		<group>
			{/* Crânio e rosto largo */}
			<mesh scale={[1, 1.06, 0.98]}>
				<sphereGeometry args={[1, 9, 7]} />
				<Mat cor={PELE} />
			</mesh>
			<mesh position={[0, -0.45, 0.08]} scale={[1.12, 0.8, 1]}>
				<sphereGeometry args={[0.95, 9, 6]} />
				<Mat cor={PELE} />
			</mesh>

			{/* Degradê nas laterais e locs no topo */}
			<mesh position={[0, 0.02, -0.02]} scale={[1, 1.06, 0.98]}>
				<sphereGeometry args={[1.02, 9, 5, 0, Math.PI * 2, 0, 1.25]} />
				<Mat cor={PELE_FADE} />
			</mesh>
			<mesh position={[0, 0.1, -0.08]} scale={[0.96, 1.05, 0.98]}>
				<sphereGeometry args={[1.05, 9, 4, 0, Math.PI * 2, 0, 0.95]} />
				<Mat cor={CABELO} />
			</mesh>
			{[-0.35, -0.12, 0.12, 0.35].map((x, i) => (
				<mesh key={i} position={[x, 1.05, 0.1 - i * 0.12]} rotation={[-0.6, 0, x]}>
					<cylinderGeometry args={[0.07, 0.07, 0.22, 5]} />
					<Mat cor={CABELO} />
				</mesh>
			))}
			<Rabo balanco={e.balancoRabo} />

			{/* Orelhas */}
			{[-1, 1].map((s) => (
				<mesh key={s} position={[s * 1.0, -0.05, -0.05]} scale={[0.45, 1, 0.8]}>
					<sphereGeometry args={[0.24, 6, 5]} />
					<Mat cor={PELE} />
				</mesh>
			))}

			<Olho x={-0.36} e={e} />
			<Olho x={0.36} e={e} />
			<Sobrancelha x={-0.37} e={e} />
			<Sobrancelha x={0.37} e={e} />

			{/* Nariz largo */}
			<mesh position={[0, -0.2, 1.0]} scale={[1.45, 0.9, 1]}>
				<sphereGeometry args={[0.19, 6, 4]} />
				<Mat cor="#5f3b2a" />
			</mesh>
			<mesh position={[0, 0.02, 0.97]} rotation={[-0.25, 0, 0]}>
				<boxGeometry args={[0.15, 0.3, 0.1]} />
				<Mat cor={PELE} />
			</mesh>

			{/* Bigode */}
			{[-1, 1].map((s) => (
				<group key={s}>
					<mesh position={[s * 0.17, -0.4, 1.0]} rotation={[0, s * 0.3, -s * 0.22]}>
						<boxGeometry args={[0.36, 0.09, 0.1]} />
						<Mat cor={BARBA} />
					</mesh>
					<mesh position={[s * 0.36, -0.53 - abre * 0.04, 0.93]} rotation={[0, s * 0.5, 0]}>
						<boxGeometry args={[0.07, 0.24, 0.08]} />
						<Mat cor={BARBA} />
					</mesh>
				</group>
			))}

			{/* Boca: abre conforme o volume da voz */}
			<group position={[0, -0.56, 0.97]}>
				<mesh>
					<boxGeometry args={[0.36, 0.04 + abre * 0.2, 0.06]} />
					<meshBasicMaterial color="#2a0c0c" />
				</mesh>
				<mesh position={[0, 0.035 + abre * 0.08, 0.02]}>
					<boxGeometry args={[0.4, 0.07, 0.1]} />
					<Mat cor={LABIO} />
				</mesh>
				<mesh position={[0, -0.045 - abre * 0.12, 0.03]}>
					<boxGeometry args={[0.38, 0.1, 0.1]} />
					<Mat cor="#66403a" />
				</mesh>
			</group>

			{/* Barba no queixo (desce junto com a boca) */}
			<mesh
				geometry={barba}
				position={[0, -0.98 - abre * 0.1, 0.6]}
				scale={[1.1, 1.0, 0.85]}
			>
				<meshLambertMaterial vertexColors flatShading />
			</mesh>

			<Ankh />

			{/* Pescoço tatuado */}
			<mesh position={[0, -1.3, -0.05]}>
				<cylinderGeometry args={[0.66, 0.78, 0.9, 8]} />
				<Mat cor={PELE} />
			</mesh>
			<TattooPescoco />

			{/* Camiseta preta oversized */}
			<mesh position={[0, -1.62, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.72, 0.09, 4, 10]} />
				<Mat cor="#1d1d22" />
			</mesh>
			<mesh position={[0, -1.98, -0.2]} scale={[2.3, 0.42, 1.2]}>
				<sphereGeometry args={[1, 10, 6]} />
				<Mat cor={CAMISA} />
			</mesh>
		</group>
	);
};
