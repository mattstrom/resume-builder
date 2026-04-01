import { ListEditor } from '@/components/ListEditor.tsx';
import { useResumeId } from '@/components/Resume.provider.tsx';
import { type FC, type PropsWithChildren } from 'react';
import type { Job } from '@resume-builder/entities';

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface JobProps extends PropsWithChildren {
	job: Job;
	index: number;
}

export const JobSection: FC<JobProps> = ({ job, index }) => {
	const resumeId = useResumeId();

	return (
		<section className="job">
			<header>
				<h3>{job.position}</h3>
			</header>
			<div>
				<span className="company">{job.company}</span>
				<span>{' | '}</span>
				<span className="location">{job.location}</span>
				<span>{' | '}</span>
				<time>
					<span className="start-date">
						{formatDate(job.startDate)}
					</span>
					{'–'}
					<span className="end-date">
						{job.endDate ? formatDate(job.endDate) : 'Present'}
					</span>
				</time>
			</div>
			{job.responsibilities && (
				<ListEditor
					path={`data.workExperience.${index}.responsibilities`}
					items={job.responsibilities}
					resumeId={resumeId}
					variant="block"
					className="responsibilities"
				/>
			)}
		</section>
	);
};
