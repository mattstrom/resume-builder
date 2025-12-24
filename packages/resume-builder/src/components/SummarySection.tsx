import { type FC, type PropsWithChildren } from 'react';
import { Section } from './Section.tsx';
import { useResume } from './Resume.provider.tsx';

interface SummaryProps extends PropsWithChildren {}

export const SummarySection: FC<SummaryProps> = () => {
	const { summary } = useResume();

	return (
		<Section heading="Summary" className="summary">
			{summary}
		</Section>
	);
};
