import { HighlightRegion } from '@/components/HighlightRegion.tsx';
import { InlineEditor } from '@/components/InlineEditor.tsx';
import { type FC, type PropsWithChildren } from 'react';
import { Section } from './Section.tsx';
import { useResume, useResumeId } from '../Resume.provider.tsx';

interface SummaryProps extends PropsWithChildren {}

export const SummarySection: FC<SummaryProps> = () => {
	const { summary } = useResume();
	const resumeId = useResumeId();

	return (
		<HighlightRegion path={'data.summary'}>
			<Section heading="Professional Summary" className="summary">
				<InlineEditor
					path="data.summary"
					value={summary}
					resumeId={resumeId}
					multiline
				/>
			</Section>
		</HighlightRegion>
	);
};
