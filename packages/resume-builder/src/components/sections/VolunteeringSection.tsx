import type { Volunteering } from '@resume-builder/entities';
import { type FC, type PropsWithChildren } from 'react';
import { useResume } from '../Resume.provider.tsx';
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
				<VolunteeringPosition key={index} volunteering={item} />
			))}
		</Section>
	);
};

interface VolunteeringProps extends PropsWithChildren {
	volunteering: Volunteering;
}

const VolunteeringPosition: FC<VolunteeringProps> = ({ volunteering }) => {
	return (
		<section className="volunteering">
			<header>
				<h3>{volunteering.position}</h3>
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
				<ul className="responsibilities">
					{volunteering.responsibilities.map((item, index) => (
						<li key={index}>{item}</li>
					))}
				</ul>
			)}
		</section>
	);
};
