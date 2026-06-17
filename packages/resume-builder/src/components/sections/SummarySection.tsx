import { type FC, type PropsWithChildren } from 'react';

import { InlineEditor } from '@/components/InlineEditor.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';

interface SummaryProps extends PropsWithChildren {}

export const SummarySection: FC<SummaryProps> = () => {
	const { summary } = useResume();
	const resumeId = useResumeId();

	return (
		<Section
			heading="Professional Summary"
			className="summary"
			path="data.summary"
			label="Summary"
		>
			<InlineEditor path="data.summary" value={summary} resumeId={resumeId} multiline />
		</Section>
	);
};
