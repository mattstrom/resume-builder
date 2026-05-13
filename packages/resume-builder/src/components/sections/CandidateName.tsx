import { type FC } from 'react';

import { InlineEditor } from '@/components/InlineEditor.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';

interface CandidateNameProps {}

export const CandidateName: FC<CandidateNameProps> = () => {
	const { name } = useResume();
	const resumeId = useResumeId();

	return (
		<InlineEditor
			as="h1"
			className="candidate-name"
			path="data.name"
			value={name}
			resumeId={resumeId}
		/>
	);
};
