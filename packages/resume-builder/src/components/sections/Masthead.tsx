import { InlineEditor } from '@/components/InlineEditor.tsx';
import { type FC } from 'react';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { ContactInformationSection } from './ContactInformationSection.tsx';

interface MastheadProps {}

export const Masthead: FC<MastheadProps> = () => {
	const { name } = useResume();
	const resumeId = useResumeId();

	return (
		<section className="masthead">
			<section className="left">
				<header className="name">
					<InlineEditor
						as="h1"
						path="data.name"
						value={name}
						resumeId={resumeId}
					/>
				</header>
			</section>
			<ContactInformationSection />
		</section>
	);
};
