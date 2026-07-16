import { type FC, type PropsWithChildren } from 'react';

import { InlineEditor } from '@/components/InlineEditor.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { RESUME_SECTION_IDS } from './section-anchors.ts';
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
			anchorId={RESUME_SECTION_IDS.professionalSummary}
			paginationUnit="professional-summary"
		>
			<InlineEditor
				path="data.summary"
				value={summary}
				resumeId={resumeId}
				multiline
				linkMarkup
			/>
		</Section>
	);
};
