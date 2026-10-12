import {random} from 'remotion';
import {TRACO} from './Personagens';

const T = {stroke: TRACO, strokeWidth: 6, strokeLinejoin: 'round' as const};

// Pontinhos de retícula, para o ar de gibi.
export const Reticula: React.FC<{id: string; cor: string; opacidade: number}> = ({id, cor, opacidade}) => (
	<>
		<defs>
			<pattern id={id} width={18} height={18} patternUnits="userSpaceOnUse">
				<circle cx={9} cy={9} r={3.2} fill={cor} />
			</pattern>
		</defs>
		<rect width={1920} height={1080} fill={`url(#${id})`} opacity={opacidade} />
	</>
);

// --------------------------------------------------------------- laje em SP, hoje, à noite

export const LajeNoite: React.FC<{t: number}> = ({t}) => (
	<g>
		<defs>
			<linearGradient id="ceu-noite" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#140c33" />
				<stop offset="0.55" stopColor="#3d2470" />
				<stop offset="1" stopColor="#c0507a" />
			</linearGradient>
		</defs>
		<rect width={1920} height={1080} fill="url(#ceu-noite)" />
		<Reticula id="ret-noite" cor="#ffffff" opacidade={0.05} />
		{new Array(50).fill(0).map((_, i) => (
			<circle
				key={i}
				cx={random(`e-x-${i}`) * 1920}
				cy={random(`e-y-${i}`) * 420}
				r={random(`e-r-${i}`) * 2.5 + 1}
				fill="#fff"
				opacity={0.4 + Math.sin(t * 3 + i) * 0.3}
			/>
		))}
		<circle cx={1560} cy={190} r={90} fill="#ffe9a8" {...T} />
		<circle cx={1530} cy={170} r={18} fill="#efd38a" />
		<circle cx={1590} cy={220} r={12} fill="#efd38a" />
		{/* Prédios */}
		{new Array(16).fill(0).map((_, i) => {
			const w = 110 + random(`p-w-${i}`) * 90;
			const x = i * 125 - 40;
			const h = 260 + random(`p-h-${i}`) * 330;
			const topo = 880 - h;
			return (
				<g key={i}>
					<rect x={x} y={topo} width={w} height={h} fill={i % 2 ? '#24183f' : '#2d1f4d'} {...T} />
					{new Array(Math.floor(h / 46)).fill(0).map((__, r) =>
						new Array(Math.floor(w / 34)).fill(0).map((___, c) =>
							random(`j-${i}-${r}-${c}`) < 0.35 ? (
								<rect key={`${r}-${c}`} x={x + 12 + c * 34} y={topo + 18 + r * 46} width={16} height={22} fill="#ffd36b" />
							) : null,
						),
					)}
				</g>
			);
		})}
		{/* Laje */}
		<rect x={0} y={860} width={1920} height={220} fill="#8d8a93" {...T} />
		<rect x={0} y={860} width={1920} height={26} fill="#a7a3ad" {...T} />
		{[180, 1700].map((x) => (
			<g key={x}>
				{[0, 22, 44].map((d) => (
					<path key={d} d={`M ${x + d} 860 v -90`} stroke="#5a3a2a" strokeWidth={7} strokeLinecap="round" />
				))}
			</g>
		))}
		{/* Caixa d'água azul */}
		<g transform="translate(250 860)">
			<path d="M -110 0 L -90 -170 L 90 -170 L 110 0 Z" fill="#2f6fd1" {...T} />
			<ellipse cx={0} cy={-170} rx={92} ry={20} fill="#4a8ae8" {...T} />
			<path d="M -60 -150 L -50 -20" stroke="#5a93e8" strokeWidth={10} strokeLinecap="round" />
		</g>
	</g>
);

// --------------------------------------------------------------- vórtice do tempo (sulcos de vinil)

export const Vortice: React.FC<{t: number}> = ({t}) => (
	<g>
		<rect width={1920} height={1080} fill="#0d0820" />
		<g transform={`translate(960 540) rotate(${t * 90})`}>
			{new Array(26).fill(0).map((_, i) => (
				<circle
					key={i}
					r={40 + i * 46}
					fill="none"
					stroke={['#7a33c4', '#ffc93c', '#36e0ff', '#c8312f'][i % 4]}
					strokeWidth={i % 4 === 1 ? 10 : 5}
					strokeDasharray={`${60 + i * 8} ${30 + i * 4}`}
					opacity={0.85}
				/>
			))}
			{new Array(12).fill(0).map((_, i) => (
				<path
					key={`b${i}`}
					d={`M 0 0 Q 300 ${-120} 1200 0`}
					transform={`rotate(${i * 30})`}
					fill="none"
					stroke="#ffffff"
					strokeWidth={4}
					opacity={0.25}
				/>
			))}
		</g>
		<circle cx={960} cy={540} r={60} fill="#fff6d6" opacity={0.9} />
	</g>
);

// --------------------------------------------------------------- quintal no Capão, anos 80, fim de tarde

export const Quintal: React.FC<{t: number}> = ({t}) => (
	<g>
		<defs>
			<linearGradient id="ceu-tarde" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#3a2a7a" />
				<stop offset="0.45" stopColor="#e2577a" />
				<stop offset="1" stopColor="#ffb257" />
			</linearGradient>
		</defs>
		<rect width={1920} height={1080} fill="url(#ceu-tarde)" />
		<circle cx={340} cy={330} r={110} fill="#ffd36b" opacity={0.9} />
		{/* Morro com casinhas ao fundo */}
		<path d="M 0 520 Q 400 380 900 470 Q 1400 360 1920 480 L 1920 700 L 0 700 Z" fill="#7a3a5a" {...T} />
		{new Array(22).fill(0).map((_, i) => {
			const x = i * 92 - 20;
			const y = 470 + Math.sin(i * 1.3) * 50 + random(`c-y-${i}`) * 30;
			return (
				<g key={i}>
					<rect x={x} y={y} width={70} height={60} fill={['#c46a4a', '#d98b5a', '#a85a4a', '#e0a46a'][i % 4]} {...T} strokeWidth={4} />
					<rect x={x + 24} y={y + 20} width={18} height={18} fill="#3a2440" />
				</g>
			);
		})}
		{/* Muro de tijolo baiano */}
		<rect x={0} y={560} width={1920} height={300} fill="#c8693c" {...T} />
		{new Array(9).fill(0).map((_, r) =>
			new Array(17).fill(0).map((__, c) => (
				<rect
					key={`${r}-${c}`}
					x={c * 120 - (r % 2 ? 60 : 0)}
					y={560 + r * 34}
					width={120}
					height={34}
					fill="none"
					stroke="#8f4426"
					strokeWidth={3}
				/>
			)),
		)}
		<rect x={0} y={560} width={1920} height={300} fill="none" {...T} />
		{/* Varal com roupas balançando */}
		<path d="M 60 600 Q 960 660 1860 600" fill="none" stroke="#3a3a3a" strokeWidth={4} />
		{[260, 520, 1360, 1600].map((x, i) => (
			<g key={x} transform={`translate(${x} ${626 + (i % 2) * 8}) rotate(${Math.sin(t * 2 + i) * 5})`}>
				<path d="M -40 0 h 80 l 10 30 l -14 4 v 70 h -62 v -70 l -14 -4 z" fill={['#2f6fd1', '#ffc93c', '#36b37e', '#f2efe7'][i]} {...T} strokeWidth={4} />
			</g>
		))}
		{/* Cordão de lâmpadas */}
		<path d="M 0 470 Q 960 560 1920 470" fill="none" stroke="#2a2a2a" strokeWidth={4} />
		{new Array(16).fill(0).map((_, i) => {
			const x = 60 + i * 120;
			const y = 470 + Math.sin((x / 1920) * Math.PI) * 88;
			const acesa = Math.sin(t * 4 + i * 1.7) > -0.6;
			return (
				<g key={i}>
					{acesa ? <circle cx={x} cy={y + 16} r={26} fill="#ffe9a8" opacity={0.35} /> : null}
					<circle cx={x} cy={y + 16} r={11} fill={acesa ? '#fff3c4' : '#b8a878'} stroke={TRACO} strokeWidth={3} />
				</g>
			);
		})}
		{/* Chão de cimento */}
		<rect x={0} y={850} width={1920} height={230} fill="#9a948c" {...T} />
		<path d="M 0 900 H 1920 M 300 850 L 200 1080 M 900 850 L 880 1080 M 1500 850 L 1620 1080" stroke="#7d7870" strokeWidth={3} />
	</g>
);
