// Personagens vetoriais no estilo desenho animado de super-herói dos anos 2000:
// contorno grosso, cores chapadas e uma sombra de "cel" por peça.

export const TRACO = '#111014';
const T = {stroke: TRACO, strokeWidth: 7, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

const PELE = '#6e4330';
const PELE_SOMBRA = '#56321f';
const CABELO = '#141011';
const TATTOO = '#2a1a12';
const OURO = '#ffc93c';

// --------------------------------------------------------------- braço genérico

type Braco = {ombro: number; cotovelo: number};

const BracoSVG: React.FC<{
	x: number;
	y: number;
	b: Braco;
	lado: 1 | -1;
	pele: string;
	manga: string;
	escala?: number;
	extra?: React.ReactNode; // desenhado no antebraço
	mao?: React.ReactNode;
	tattoo?: boolean;
}> = ({x, y, b, lado, pele, manga, escala = 1, extra, mao, tattoo}) => {
	const L1 = 170 * escala;
	const L2 = 160 * escala;
	const w1 = 62 * escala;
	const w2 = 56 * escala;
	return (
		<g transform={`translate(${x} ${y}) rotate(${b.ombro * lado})`}>
			<rect x={-w1 / 2} y={-12} width={w1} height={L1 + 24} rx={w1 / 2} fill={pele} {...T} />
			<g transform={`translate(0 ${L1}) rotate(${b.cotovelo * lado})`}>
				<rect x={-w2 / 2} y={-14} width={w2} height={L2 + 18} rx={w2 / 2} fill={pele} {...T} />
				{tattoo ? (
					<g stroke={TATTOO} strokeWidth={4} fill="none" strokeLinecap="round">
						<path d={`M ${-14 * escala} ${30 * escala} q ${10 * escala} ${-12 * escala} ${20 * escala} 0 t ${10 * escala} ${14 * escala}`} />
						<path d={`M ${-16 * escala} ${62 * escala} q ${14 * escala} ${10 * escala} ${28 * escala} ${-6 * escala}`} />
						<path d={`M ${-8 * escala} ${92 * escala} l ${4 * escala} ${22 * escala} m ${8 * escala} ${-22 * escala} l ${2 * escala} ${20 * escala}`} />
					</g>
				) : null}
				{extra}
				<g transform={`translate(0 ${L2 + 10})`}>{mao ?? <circle r={34 * escala} fill={pele} {...T} />}</g>
			</g>
			<path
				d={`M ${-w1 / 2 - 10 * escala} ${-30 * escala} h ${w1 + 20 * escala} v ${95 * escala} q ${-(w1 + 20 * escala) / 2} ${12 * escala} ${-(w1 + 20 * escala)} 0 z`}
				fill={manga}
				{...T}
			/>
		</g>
	);
};

// --------------------------------------------------------------- Lobandoleiro

export type PoseLoba = {
	bracoE: Braco; // braço do lado esquerdo da tela
	bracoD: Braco; // braço com o Toca-Tempo
	cabeca: number; // inclinação em graus
	boca: number; // 0..1
	piscar: number; // 0..1
	sobrancelha: number; // 0..1
	olhar: number; // -1..1
	balanco: number; // sobe/desce do corpo (px)
	rabo: number; // balanço do rabo de cavalo (graus)
	discoGiro: number; // graus
	discoBrilho: number; // 0..1
	pernas?: number; // abertura das pernas
};

export const POSE_LOBA: PoseLoba = {
	bracoE: {ombro: 12, cotovelo: -8},
	bracoD: {ombro: 12, cotovelo: -8},
	cabeca: 0,
	boca: 0,
	piscar: 0,
	sobrancelha: 0,
	olhar: 0,
	balanco: 0,
	rabo: 0,
	discoGiro: 0,
	discoBrilho: 0,
	pernas: 0,
};

const TocaTempo: React.FC<{giro: number; brilho: number}> = ({giro, brilho}) => (
	<g transform="translate(0 92)">
		{brilho > 0 ? <circle r={70 + brilho * 30} fill={OURO} opacity={0.35 * brilho} /> : null}
		<rect x={-46} y={-44} width={92} height={88} rx={14} fill="#c8312f" {...T} />
		<g transform={`rotate(${giro})`}>
			<circle r={33} fill="#151515" {...T} strokeWidth={5} />
			<circle r={22} fill="none" stroke="#3a3a3a" strokeWidth={3} />
			<circle r={11} fill={OURO} stroke={TRACO} strokeWidth={3} />
			<rect x={-2} y={-30} width={4} height={10} fill="#777" />
		</g>
	</g>
);

const CabecaLoba: React.FC<{p: PoseLoba}> = ({p}) => {
	const aberto = Math.max(0.08, 1 - p.piscar);
	const s = p.sobrancelha * 12;
	return (
		<g>
			{/* Rabo de cavalo de locs, atrás da cabeça */}
			<g transform={`translate(25 -262) rotate(${p.rabo})`}>
				{[-14, 0, 14, 26].map((dy, i) => (
					<path
						key={i}
						d={`M 0 ${dy * 0.3} Q 70 ${-50 + dy} ${120 + i * 6} ${10 + dy * 2}`}
						fill="none"
						stroke={TRACO}
						strokeWidth={30}
						strokeLinecap="round"
					/>
				))}
				{[-14, 0, 14, 26].map((dy, i) => (
					<path
						key={`c${i}`}
						d={`M 0 ${dy * 0.3} Q 70 ${-50 + dy} ${120 + i * 6} ${10 + dy * 2}`}
						fill="none"
						stroke={CABELO}
						strokeWidth={18}
						strokeLinecap="round"
					/>
				))}
				<rect x={-6} y={-16} width={16} height={34} rx={5} fill="#c8312f" {...T} strokeWidth={4} />
			</g>
			{/* Orelhas */}
			<ellipse cx={-114} cy={-120} rx={22} ry={34} fill={PELE} {...T} />
			<ellipse cx={114} cy={-120} rx={22} ry={34} fill={PELE} {...T} />
			{/* Rosto largo */}
			<path
				d="M -112 -170 Q -124 -80 -98 -30 Q -60 12 0 14 Q 60 12 98 -30 Q 124 -80 112 -170 Q 104 -262 0 -266 Q -104 -262 -112 -170 Z"
				fill={PELE}
				{...T}
			/>
			<path d="M 60 -60 Q 98 -60 104 -110 Q 112 -40 70 -12 Z" fill={PELE_SOMBRA} />
			{/* Degradê nas laterais */}
			<path d="M -110 -165 Q -108 -232 -62 -256 L -64 -212 Q -96 -200 -108 -150 Z" fill="#4a2f25" />
			<path d="M 110 -165 Q 108 -232 62 -256 L 64 -212 Q 96 -200 108 -150 Z" fill="#4a2f25" />
			{/* Locs no topo com o line-up reto */}
			<path d="M -72 -246 Q 0 -306 72 -246 L 66 -214 Q 0 -222 -66 -214 Z" fill={CABELO} {...T} />
			{[-48, -16, 16, 48].map((x) => (
				<rect key={x} x={x - 9} y={-292} width={18} height={40} rx={9} fill={CABELO} transform={`rotate(${x * 0.3} ${x} -270)`} />
			))}
			{/* Sobrancelhas grossas */}
			<path d={`M -86 ${-160 - s} L -22 ${-170 - s * 1.3}`} stroke={CABELO} strokeWidth={18} strokeLinecap="round" />
			<path d={`M 86 ${-160 - s} L 22 ${-170 - s * 1.3}`} stroke={CABELO} strokeWidth={18} strokeLinecap="round" />
			{/* Olhos */}
			{[-52, 52].map((x) => (
				<g key={x} transform={`translate(${x} -128) scale(1 ${aberto})`}>
					<ellipse rx={25} ry={15} fill="#f6efe4" stroke={TRACO} strokeWidth={5} />
					<circle cx={p.olhar * 8} r={10} fill="#1a0d08" />
					<circle cx={p.olhar * 8 + 3} cy={-3} r={3} fill="#fff" />
				</g>
			))}
			{/* Ankh na têmpora */}
			<g stroke={TATTOO} strokeWidth={4} fill="none" strokeLinecap="round">
				<ellipse cx={90} cy={-166} rx={5} ry={7} />
				<path d="M 90 -159 V -132 M 82 -152 H 98" />
			</g>
			{/* Nariz largo */}
			<path d="M -28 -82 Q -36 -60 -14 -56 Q 0 -52 14 -56 Q 36 -60 28 -82" fill={PELE_SOMBRA} {...T} strokeWidth={5} />
			{/* Boca, barba e bigode */}
			<ellipse cx={0} cy={-24 + p.boca * 6} rx={26 - p.boca * 4} ry={4 + p.boca * 17} fill="#3a0f0f" {...T} strokeWidth={5} />
			{p.boca > 0.3 ? <rect x={-16} y={-24 + p.boca * 6 - (4 + p.boca * 17) + 3} width={32} height={7} fill="#f2ece2" /> : null}
			<g transform={`translate(0 ${p.boca * 12})`}>
				<path d="M -52 -12 Q -62 18 -40 36 Q 0 62 40 36 Q 62 18 52 -12 Q 30 6 0 8 Q -30 6 -52 -12 Z" fill={CABELO} {...T} />
				<circle cx={-14} cy={30} r={3} fill="#bdb6ad" />
				<circle cx={18} cy={40} r={3} fill="#bdb6ad" />
				<circle cx={4} cy={22} r={2.5} fill="#bdb6ad" />
			</g>
			<path
				d="M -58 -42 Q -30 -58 0 -50 Q 30 -58 58 -42 Q 62 -24 50 -16 Q 30 -36 0 -32 Q -30 -36 -50 -16 Q -62 -24 -58 -42 Z"
				fill={CABELO}
				{...T}
				strokeWidth={5}
			/>
		</g>
	);
};

export const Lobandoleiro: React.FC<{p: PoseLoba; x: number; y: number; escala: number; espelhar?: boolean}> = ({
	p,
	x,
	y,
	escala,
	espelhar,
}) => {
	const abre = p.pernas ?? 0;
	return (
		<g transform={`translate(${x} ${y}) scale(${espelhar ? -escala : escala} ${escala})`}>
			<ellipse cx={0} cy={0} rx={190} ry={26} fill="#000" opacity={0.25} />
			{/* Pernas */}
			{[-1, 1].map((l) => (
				<g key={l} transform={`rotate(${l * abre} ${l * 40} -320)`}>
					<path d={`M ${l * 12} -330 L ${l * 74} -330 L ${l * 70} -40 L ${l * 14} -40 Z`} fill="#3b3f4a" {...T} />
					<path d={`M ${l * 6} -50 h ${l * 88} q ${l * 14} 0 ${l * 14} 26 v 18 h ${-l * 106} z`} fill="#f4f1ea" {...T} />
					<path d={`M ${l * 6} -12 h ${l * 102}`} stroke="#c8312f" strokeWidth={8} />
				</g>
			))}
			<g transform={`translate(0 ${p.balanco})`}>
				{/* Tronco: camiseta preta larga com o emblema */}
				<path
					d="M -152 -650 Q -182 -480 -164 -400 Q -152 -330 -144 -300 L 144 -300 Q 152 -330 164 -400 Q 182 -480 152 -650 Q 0 -690 -152 -650 Z"
					fill="#1d1d24"
					{...T}
				/>
				<path d="M 60 -650 Q 170 -560 150 -310 L 144 -300 Q 152 -330 164 -400 Q 182 -480 152 -650 Z" fill="#121217" />
				<g transform="translate(-10 -500)">
					<circle r={52} fill={OURO} {...T} />
					<circle r={36} fill="none" stroke="#a87a12" strokeWidth={4} />
					<circle r={22} fill="none" stroke="#a87a12" strokeWidth={4} />
					<path d="M -8 -40 L 12 -6 L -4 -2 L 10 40 L -16 0 L 0 -4 Z" fill="#c8312f" stroke={TRACO} strokeWidth={4} strokeLinejoin="round" />
				</g>
				{/* Pescoço tatuado */}
				<path d="M -52 -700 L 52 -700 L 58 -640 Q 0 -620 -58 -640 Z" fill={PELE} {...T} />
				<g stroke={TATTOO} strokeWidth={5} strokeLinecap="round">
					<path d="M -30 -690 v 40 M -12 -694 v 46 M 8 -694 v 44 M 28 -690 v 38" />
					<path d="M -6 -668 l 10 10 m 0 -10 l -10 10" />
				</g>
				<g transform={`translate(0 -690) rotate(${p.cabeca})`}>
					<CabecaLoba p={p} />
				</g>
				<BracoSVG x={-148} y={-610} b={p.bracoE} lado={1} pele={PELE} manga="#1d1d24" tattoo />
				<BracoSVG
					x={148}
					y={-610}
					b={p.bracoD}
					lado={-1}
					pele={PELE}
					manga="#1d1d24"
					tattoo
					extra={<TocaTempo giro={p.discoGiro} brilho={p.discoBrilho} />}
				/>
			</g>
		</g>
	);
};

// --------------------------------------------------------------- Paulinho (moleque do repinique)

export type PosePaulinho = {
	batida: number; // 0..1 fase da batida (alterna as mãos)
	danca: number; // 0 = tocando, 1 = dançando
	fase: number; // tempo para os passos
	boca: number;
	sorriso: number;
	cabeca: number;
};

const Repinique: React.FC = () => (
	<g>
		<rect x={-70} y={-40} width={140} height={110} fill="#c9ced6" {...T} />
		<rect x={-70} y={-40} width={140} height={20} fill="#8f96a3" stroke={TRACO} strokeWidth={5} />
		<rect x={-70} y={50} width={140} height={20} fill="#8f96a3" stroke={TRACO} strokeWidth={5} />
		{[-45, -15, 15, 45].map((x) => (
			<path key={x} d={`M ${x} -20 L ${x + 10} 50`} stroke="#6b7280" strokeWidth={5} />
		))}
		<ellipse cx={0} cy={-40} rx={70} ry={18} fill="#f1efe9" {...T} />
	</g>
);

export const Paulinho: React.FC<{p: PosePaulinho; x: number; y: number; escala: number}> = ({p, x, y, escala}) => {
	const pele = '#5b3626';
	const bateE = p.danca < 0.5 ? (p.batida < 0.5 ? -40 : 10) : 0;
	const bateD = p.danca < 0.5 ? (p.batida >= 0.5 ? -40 : 10) : 0;
	const passo = Math.sin(p.fase * 9) * 40 * p.danca;
	const quadril = Math.sin(p.fase * 9) * 14 * p.danca;
	const pulo = Math.abs(Math.sin(p.fase * 9)) * -14 * p.danca;
	const baqueta = (ang: number) => (
		<g>
			<circle r={28} fill={pele} {...T} />
			<g transform={`rotate(${ang})`}>
				<rect x={-6} y={-150} width={12} height={150} rx={6} fill="#e9d29a" stroke={TRACO} strokeWidth={5} />
			</g>
		</g>
	);
	return (
		<g transform={`translate(${x} ${y}) scale(${escala})`}>
			<ellipse cx={0} cy={0} rx={130} ry={20} fill="#000" opacity={0.25} />
			<g transform={`translate(0 ${pulo})`}>
				{/* Pernas e tênis */}
				{[-1, 1].map((l) => (
					<g key={l} transform={`translate(${l === 1 ? passo : -passo * 0.4} 0)`}>
						<rect x={l * 16 - 22} y={-250} width={44} height={220} rx={18} fill={pele} {...T} />
						<path d={`M ${l * 16 - 30} -44 h 60 q 14 0 14 22 v 18 h -74 z`} fill="#f4f1ea" {...T} />
					</g>
				))}
				<g transform={`rotate(${quadril} 0 -260)`}>
					{/* Bermuda */}
					<path d="M -76 -330 L 76 -330 L 84 -210 L 6 -210 L 0 -250 L -6 -210 L -84 -210 Z" fill="#2f5fa8" {...T} />
					{/* Camiseta branca larga */}
					<path d="M -104 -560 Q -122 -440 -96 -320 L 96 -320 Q 122 -440 104 -560 Q 0 -590 -104 -560 Z" fill="#f2efe7" {...T} />
					<path d="M 40 -560 Q 120 -470 96 -320 L 70 -320 Q 92 -450 40 -560 Z" fill="#d8d3c7" />
					{/* Talabarte do repinique */}
					{p.danca < 0.5 ? <path d="M -90 -540 L 70 -330" stroke="#c8312f" strokeWidth={14} /> : null}
					{/* Pescoço e cabeça */}
					<rect x={-30} y={-610} width={60} height={60} fill={pele} {...T} />
					<g transform={`translate(0 -600) rotate(${p.cabeca})`}>
						<ellipse cx={-80} cy={-100} rx={18} ry={28} fill={pele} {...T} />
						<ellipse cx={80} cy={-100} rx={18} ry={28} fill={pele} {...T} />
						<path d="M -84 -150 Q -92 -60 -60 -20 Q 0 10 60 -20 Q 92 -60 84 -150 Q 76 -212 0 -214 Q -76 -212 -84 -150 Z" fill={pele} {...T} />
						{/* Boné virado pra trás */}
						<path d="M -88 -150 Q -84 -232 0 -236 Q 84 -232 88 -150 Q 0 -170 -88 -150 Z" fill="#c8312f" {...T} />
						<path d="M 40 -210 Q 110 -214 120 -186 Q 90 -178 50 -186 Z" fill="#9e2422" {...T} strokeWidth={5} />
						<path d="M -60 -126 L -18 -132 M 60 -126 L 18 -132" stroke={TRACO} strokeWidth={12} strokeLinecap="round" />
						{[-38, 38].map((ex) => (
							<g key={ex} transform={`translate(${ex} -100)`}>
								<ellipse rx={17} ry={12} fill="#f6efe4" stroke={TRACO} strokeWidth={4} />
								<circle r={7} fill="#1a0d08" />
							</g>
						))}
						<path d="M -16 -66 Q 0 -54 16 -66" fill="none" stroke={TRACO} strokeWidth={5} />
						{p.boca > 0.15 ? (
							<ellipse cx={0} cy={-34} rx={18} ry={4 + p.boca * 14} fill="#3a0f0f" {...T} strokeWidth={5} />
						) : (
							<path
								d={`M -26 -38 Q 0 ${-38 + 18 * p.sorriso} 26 -38`}
								fill="none"
								stroke={TRACO}
								strokeWidth={6}
								strokeLinecap="round"
							/>
						)}
					</g>
					{/* Braços: tocando (baquetas) ou dançando (abertos) */}
					<BracoSVG
						x={-100}
						y={-530}
						b={p.danca < 0.5 ? {ombro: -20, cotovelo: -95 + bateE} : {ombro: 70 + Math.sin(p.fase * 9) * 20, cotovelo: -60}}
						lado={1}
						pele={pele}
						manga="#f2efe7"
						escala={0.8}
						mao={p.danca < 0.5 ? baqueta(-60) : undefined}
					/>
					<BracoSVG
						x={100}
						y={-530}
						b={p.danca < 0.5 ? {ombro: -20, cotovelo: -95 + bateD} : {ombro: 70 - Math.sin(p.fase * 9) * 20, cotovelo: -60}}
						lado={-1}
						pele={pele}
						manga="#f2efe7"
						escala={0.8}
						mao={p.danca < 0.5 ? baqueta(60) : undefined}
					/>
					{p.danca < 0.5 ? (
						<g transform="translate(0 -330)">
							<Repinique />
						</g>
					) : null}
				</g>
			</g>
		</g>
	);
};

// --------------------------------------------------------------- Sambistas da roda

export type Instrumento = 'pandeiro' | 'cavaco' | 'surdo';

export const Sambista: React.FC<{
	x: number;
	y: number;
	escala: number;
	camisa: string;
	pele: string;
	instrumento: Instrumento;
	fase: number;
	boca: number;
	olhando: number; // -1 esquerda, 0 frente, 1 direita
	parado: boolean;
	chapeu?: boolean;
	aponta?: boolean;
}> = ({x, y, escala, camisa, pele, instrumento, fase, boca, olhando, parado, chapeu, aponta}) => {
	const bate = parado ? 0 : Math.sin(fase * 11);
	const bob = parado ? 0 : Math.abs(Math.sin(fase * 5.5)) * -8;
	return (
		<g transform={`translate(${x} ${y + bob}) scale(${escala})`}>
			<ellipse cx={0} cy={0} rx={120} ry={18} fill="#000" opacity={0.25} />
			{[-1, 1].map((l) => (
				<g key={l}>
					<rect x={l * 26 - 24} y={-240} width={48} height={210} rx={14} fill="#3b3a44" {...T} />
					<path d={`M ${l * 26 - 30} -40 h 62 q 12 0 12 20 v 16 h -74 z`} fill="#2a2a2a" {...T} />
				</g>
			))}
			<path d="M -100 -540 Q -116 -420 -92 -230 L 92 -230 Q 116 -420 100 -540 Q 0 -570 -100 -540 Z" fill={camisa} {...T} />
			<rect x={-28} y={-590} width={56} height={56} fill={pele} {...T} />
			<g transform={`translate(0 -580) rotate(${olhando * 8})`}>
				<path d="M -80 -140 Q -88 -50 -56 -16 Q 0 10 56 -16 Q 88 -50 80 -140 Q 72 -206 0 -208 Q -72 -206 -80 -140 Z" fill={pele} {...T} />
				{chapeu ? (
					<g>
						<ellipse cx={0} cy={-150} rx={118} ry={22} fill="#e9dcb6" {...T} />
						<path d="M -70 -150 Q -66 -232 0 -234 Q 66 -232 70 -150 Z" fill="#e9dcb6" {...T} />
						<rect x={-70} y={-176} width={140} height={20} fill="#2a2a2a" />
					</g>
				) : (
					<path d="M -80 -150 Q -76 -216 0 -218 Q 76 -216 80 -150 Q 0 -176 -80 -150 Z" fill="#141011" {...T} />
				)}
				{[-34, 34].map((ex) => (
					<g key={ex} transform={`translate(${ex} -100)`}>
						<ellipse rx={15} ry={11} fill="#f6efe4" stroke={TRACO} strokeWidth={4} />
						<circle cx={olhando * 7} r={6} fill="#1a0d08" />
					</g>
				))}
				<path d="M -44 -128 L -14 -132 M 44 -128 L 14 -132" stroke={TRACO} strokeWidth={9} strokeLinecap="round" />
				{boca > 0.15 ? (
					<ellipse cx={0} cy={-40} rx={18} ry={4 + boca * 16} fill="#3a0f0f" {...T} strokeWidth={5} />
				) : (
					<path d="M -22 -42 Q 0 -30 22 -42" fill="none" stroke={TRACO} strokeWidth={6} strokeLinecap="round" />
				)}
			</g>
			{instrumento === 'pandeiro' ? (
				<>
					<BracoSVG x={-96} y={-510} b={{ombro: 10, cotovelo: -20}} lado={1} pele={pele} manga={camisa} escala={0.8} />
					<BracoSVG
						x={96}
						y={-510}
						b={aponta ? {ombro: 100, cotovelo: -10} : {ombro: 150 + bate * 8, cotovelo: 20}}
						lado={-1}
						pele={pele}
						manga={camisa}
						escala={0.8}
						mao={
							aponta ? (
								<g>
									<circle r={28} fill={pele} {...T} />
									<rect x={-8} y={10} width={16} height={46} rx={8} fill={pele} {...T} strokeWidth={5} />
								</g>
							) : (
								<g transform={`rotate(${bate * 15})`}>
									<circle r={62} fill="#d9b77a" {...T} />
									<circle r={44} fill="#f3e6c6" stroke="#b08d4e" strokeWidth={4} />
									{[0, 60, 120, 180, 240, 300].map((a) => (
										<circle key={a} cx={Math.cos((a * Math.PI) / 180) * 54} cy={Math.sin((a * Math.PI) / 180) * 54} r={8} fill="#cfd3da" stroke={TRACO} strokeWidth={3} />
									))}
								</g>
							)
						}
					/>
				</>
			) : instrumento === 'cavaco' ? (
				<>
					<g transform="translate(0 -380) rotate(-28)">
						<rect x={60} y={-14} width={170} height={28} fill="#7a4a24" {...T} />
						<path d="M -90 0 Q -90 -62 -30 -58 Q 0 -40 30 -58 Q 90 -62 90 0 Q 90 62 30 58 Q 0 40 -30 58 Q -90 62 -90 0 Z" fill="#c98a3c" {...T} />
						<circle r={20} fill="#3b2412" />
					</g>
					<BracoSVG x={-96} y={-510} b={{ombro: 30 + bate * 6, cotovelo: -70}} lado={1} pele={pele} manga={camisa} escala={0.8} />
					<BracoSVG x={96} y={-510} b={{ombro: 40, cotovelo: -110}} lado={-1} pele={pele} manga={camisa} escala={0.8} />
				</>
			) : (
				<>
					<g transform="translate(0 -300)">
						<rect x={-110} y={-90} width={220} height={180} fill="#d8dce2" {...T} />
						<rect x={-110} y={-90} width={220} height={26} fill="#2f5fa8" stroke={TRACO} strokeWidth={5} />
						<rect x={-110} y={64} width={220} height={26} fill="#2f5fa8" stroke={TRACO} strokeWidth={5} />
						<ellipse cx={0} cy={-90} rx={110} ry={26} fill="#f1efe9" {...T} />
					</g>
					<BracoSVG x={-96} y={-510} b={{ombro: 20, cotovelo: -60}} lado={1} pele={pele} manga={camisa} escala={0.8} />
					<BracoSVG
						x={96}
						y={-510}
						b={{ombro: 30 - bate * 25, cotovelo: -60 - bate * 20}}
						lado={-1}
						pele={pele}
						manga={camisa}
						escala={0.8}
						mao={
							<g>
								<circle r={28} fill={pele} {...T} />
								<g transform="rotate(-70)">
									<rect x={-6} y={-120} width={12} height={120} fill="#e9d29a" stroke={TRACO} strokeWidth={4} />
									<circle cy={-120} r={18} fill="#f4f1ea" {...T} strokeWidth={4} />
								</g>
							</g>
						}
					/>
				</>
			)}
		</g>
	);
};

// --------------------------------------------------------------- balão de onomatopeia

export const Estouro: React.FC<{x: number; y: number; texto: string; escala: number; cor?: string; giro?: number}> = ({
	x,
	y,
	texto,
	escala,
	cor = OURO,
	giro = -8,
}) => {
	const pontas = 14;
	const pts = new Array(pontas * 2)
		.fill(0)
		.map((_, i) => {
			const r = i % 2 ? 120 : 190;
			const a = (i / (pontas * 2)) * Math.PI * 2;
			return `${Math.cos(a) * r * 1.6},${Math.sin(a) * r}`;
		})
		.join(' ');
	return (
		<g transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
			<polygon points={pts} fill={cor} stroke={TRACO} strokeWidth={10} strokeLinejoin="round" />
			<text
				textAnchor="middle"
				dominantBaseline="central"
				fontFamily="Bangers"
				fontSize={texto.length > 8 ? 80 : 110}
				fill="#c8312f"
				stroke={TRACO}
				strokeWidth={6}
				paintOrder="stroke"
				letterSpacing={3}
			>
				{texto}
			</text>
		</g>
	);
};
