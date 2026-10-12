import {Composition} from 'remotion';
import {LadoBIntro} from './LadoBIntro';
import {Historia} from './historia/Historia';
import {Noir} from './noir/Noir';
import {DURACAO_S} from './historia/roteiro';

export const RemotionRoot: React.FC = () => {
	return (
		<>
		<Composition
			id="LadoBIntro"
			component={LadoBIntro}
			durationInFrames={300}
			fps={30}
			width={1920}
			height={1080}
		/>
		<Composition
			id="Historia"
			component={Historia}
			durationInFrames={DURACAO_S * 30}
			fps={30}
			width={1920}
			height={1080}
		/>
		<Composition
			id="Noir"
			component={Noir}
			durationInFrames={23 * 30}
			fps={30}
			width={1920}
			height={1080}
		/>
		</>
	);
};
