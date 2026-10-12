import {Composition} from 'remotion';
import {LadoBIntro} from './LadoBIntro';

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			id="LadoBIntro"
			component={LadoBIntro}
			durationInFrames={300}
			fps={30}
			width={1920}
			height={1080}
		/>
	);
};
