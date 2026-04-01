import type { Volunteering } from '@resume-builder/entities';
import { type FC, type PropsWithChildren } from 'react';
import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		timeZone: 'UTC',
	});
}

interface VolunteeringSectionProps {}

export const VolunteeringSection: FC<VolunteeringSectionProps> = () => {
	const { volunteering } = useResume();

	if (!volunteering || volunteering.length === 0) {
		return null;
	}

	return (
		<Section heading="Volunteering" className="volunteering">
			{volunteering.map((item, index) => (
				<VolunteeringPosition
					key={index}
					volunteering={item}
					index={index}
				/>
			))}
		</Section>
	);
};

interface VolunteeringProps extends PropsWithChildren {
	volunteering: Volunteering;
	index: number;
}

const VolunteeringPosition: FC<VolunteeringProps> = ({
	volunteering,
	index,
}) => {
	const resumeId = useResumeId();

	return (
		<section className="volunteering">
			<header>
				<InlineEditor
					as="h3"
					path={`data.volunteering.${index}.position`}
					value={volunteering.position}
					resumeId={resumeId}
				/>
				<span>{' | '}</span>
				<time>
					<span className="start-date">
						{formatDate(volunteering.startDate)}
					</span>
					{'–'}
					<span className="end-date">
						{volunteering.endDate
							? formatDate(volunteering.endDate)
							: 'Present'}
					</span>
				</time>
			</header>
			{volunteering.responsibilities && (
				<ListEditor
					path={`data.volunteering.${index}.responsibilities`}
					items={volunteering.responsibilities}
					resumeId={resumeId}
					variant="block"
					className="responsibilities"
				/>
			)}
		</section>
	);
};
