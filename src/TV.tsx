import {useMemo} from 'react';
import {random, useCurrentFrame} from 'remotion';
import * as THREE from 'three';

// TV de tubo low-poly. A tela fica à esquerda, o painel de botões à direita,
// e o personagem vai dentro da caixa (children), atrás de um vidro com scanlines.

const CORPO = '#3b3946';
const PAINEL = '#b9ab8c';
const BORDA = '#18171d';

// Abertura da tela, em coordenadas locais da TV.
export const TELA = {x: -0.35, largura: 2.5, altura: 1.9};

const Mat: React.FC<{cor: string}> = ({cor}) => (
	<meshLambertMaterial color={cor} flatShading />
);

const useScanlines = () =>
	useMemo(() => {
		const h = 96;
		const data = new Uint8Array(4 * h);
		for (let y = 0; y < h; y++) {
			data[y * 4 + 3] = y % 2 === 0 ? 90 : 0;
		}
		const t = new THREE.DataTexture(data, 1, h);
		t.magFilter = THREE.NearestFilter;
		t.needsUpdate = true;
		return t;
	}, []);

const useChuvisco = (frame: number) => {
	const textura = useMemo(() => {
		const t = new THREE.DataTexture(new Uint8Array(4 * 80 * 60), 80, 60);
		t.magFilter = THREE.NearestFilter;
		return t;
	}, []);
	useMemo(() => {
		const d = textura.image.data as Uint8Array;
		for (let i = 0; i < 80 * 60; i++) {
			const v = Math.floor(random(`chuvisco-${frame}-${i}`) * 255);
			d[i * 4] = v;
			d[i * 4 + 1] = v;
			d[i * 4 + 2] = v;
			d[i * 4 + 3] = 255;
		}
		textura.needsUpdate = true;
	}, [frame, textura]);
	return textura;
};

export const TV: React.FC<{
	children: React.ReactNode;
	desligada: number; // 1 = tela preta, 0 = ligada
	chuvisco: number; // opacidade do chuvisco
	flash: number; // linha branca de ligar/desligar
}> = ({children, desligada, chuvisco, flash}) => {
	const frame = useCurrentFrame();
	const scan = useScanlines();
	const ruido = useChuvisco(frame);
	const {x, largura: w, altura: h} = TELA;
	const L = 1.95; // meia largura externa
	const A = 1.4; // meia altura externa
	const P = 2.2; // profundidade

	return (
		<group>
			{/* Moldura em volta da tela */}
			<mesh position={[0, (A + h / 2) / 2, 0]}>
				<boxGeometry args={[L * 2, A - h / 2, P]} />
				<Mat cor={CORPO} />
			</mesh>
			<mesh position={[0, -(A + h / 2) / 2, 0]}>
				<boxGeometry args={[L * 2, A - h / 2, P]} />
				<Mat cor={CORPO} />
			</mesh>
			<mesh position={[(-L + x - w / 2) / 2, 0, 0]}>
				<boxGeometry args={[x - w / 2 + L, h, P]} />
				<Mat cor={CORPO} />
			</mesh>
			<mesh position={[(L + x + w / 2) / 2, 0, 0]}>
				<boxGeometry args={[L - x - w / 2, h, P]} />
				<Mat cor={CORPO} />
			</mesh>
			<mesh position={[0, 0, -P / 2]}>
				<boxGeometry args={[L * 2, A * 2, 0.05]} />
				<Mat cor={CORPO} />
			</mesh>

			{/* Borda escura da tela */}
			{[
				[x, h / 2 + 0.04, w + 0.16, 0.08],
				[x, -h / 2 - 0.04, w + 0.16, 0.08],
			].map(([px, py, bw, bh], i) => (
				<mesh key={i} position={[px, py, P / 2 + 0.02]}>
					<boxGeometry args={[bw, bh, 0.06]} />
					<Mat cor={BORDA} />
				</mesh>
			))}
			{[x - w / 2 - 0.04, x + w / 2 + 0.04].map((px, i) => (
				<mesh key={i} position={[px, 0, P / 2 + 0.02]}>
					<boxGeometry args={[0.08, h + 0.16, 0.06]} />
					<Mat cor={BORDA} />
				</mesh>
			))}

			{/* Painel de botões */}
			<mesh position={[1.42, 0, P / 2 + 0.01]}>
				<boxGeometry args={[0.85, 2.2, 0.04]} />
				<Mat cor={PAINEL} />
			</mesh>
			{[0.62, 0.05].map((py, i) => (
				<mesh key={i} position={[1.42, py, P / 2 + 0.1]} rotation={[Math.PI / 2, 0, frame * 0.02 * (i + 1)]}>
					<cylinderGeometry args={[0.2, 0.22, 0.16, 7]} />
					<Mat cor="#2a2830" />
				</mesh>
			))}
			{[0, 1, 2, 3, 4].map((i) => (
				<mesh key={i} position={[1.42, -0.45 - i * 0.12, P / 2 + 0.04]}>
					<boxGeometry args={[0.6, 0.04, 0.03]} />
					<Mat cor="#2a2830" />
				</mesh>
			))}
			<mesh position={[1.7, -1.05, P / 2 + 0.05]}>
				<boxGeometry args={[0.1, 0.1, 0.05]} />
				<meshBasicMaterial color={desligada > 0.5 ? '#401010' : '#ff3030'} />
			</mesh>

			{/* Antenas */}
			{[-1, 1].map((s) => (
				<group key={s} position={[0, A, -0.3]} rotation={[0, 0, -s * 0.5 + Math.sin(frame * 0.05 + s) * 0.04]}>
					<mesh position={[0, 0.75, 0]}>
						<cylinderGeometry args={[0.025, 0.035, 1.5, 4]} />
						<Mat cor="#9a9aa6" />
					</mesh>
					<mesh position={[0, 1.52, 0]}>
						<sphereGeometry args={[0.07, 5, 4]} />
						<Mat cor="#c0c0cc" />
					</mesh>
				</group>
			))}
			<mesh position={[0, A + 0.06, -0.3]}>
				<sphereGeometry args={[0.18, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
				<Mat cor={CORPO} />
			</mesh>

			{/* Pés */}
			{[-1.4, 1.4].map((px) => (
				<mesh key={px} position={[px, -A - 0.1, 0]}>
					<boxGeometry args={[0.35, 0.2, 1.6]} />
					<Mat cor={BORDA} />
				</mesh>
			))}

			{/* Fundo da tela: brilho azul de tubo */}
			<mesh position={[x, 0, -P / 2 + 0.06]}>
				<planeGeometry args={[w, h]} />
				<meshBasicMaterial color="#0d3a52" />
			</mesh>
			<pointLight position={[x - 0.8, 0.6, 0.6]} color="#7fd8ff" intensity={2.2} distance={4} />

			{/* Personagem dentro da TV */}
			<group position={[x, 0, -0.1]}>{children}</group>

			{/* Vidro: scanlines, chuvisco, tela preta e flash */}
			<mesh position={[x, 0, P / 2 - 0.02]}>
				<planeGeometry args={[w, h]} />
				<meshBasicMaterial map={ruido} transparent opacity={chuvisco} depthWrite={false} />
			</mesh>
			<mesh position={[x, 0, P / 2 - 0.015]}>
				<planeGeometry args={[w, h]} />
				<meshBasicMaterial color="#000" transparent opacity={desligada} depthWrite={false} />
			</mesh>
			<mesh position={[x, 0, P / 2 - 0.01]} scale={[Math.max(0.001, flash), Math.max(0.001, flash * 0.04 + 0.01), 1]}>
				<planeGeometry args={[w, h]} />
				<meshBasicMaterial color="#e8fbff" transparent opacity={flash > 0 ? 1 : 0} depthWrite={false} />
			</mesh>
			<mesh position={[x, 0, P / 2 - 0.005]}>
				<planeGeometry args={[w, h]} />
				<meshBasicMaterial map={scan} transparent depthWrite={false} />
			</mesh>
		</group>
	);
};
