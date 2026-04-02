import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import { useResumeId } from '@/components/Resume.provider.tsx';
import { type FC, type PropsWithChildren, type ReactNode } from 'react';
import type { Job } from '@resume-builder/entities';

function formatDate(dateString: string): string {
	if (!dateString) {
		return 'Date TBD';
	}

	const date = new Date(dateString);

	if (Number.isNaN(date.getTime())) {
		return dateString;
	}

	return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface JobProps extends PropsWithChildren {
	job: Job;
	index: number;
	actions?: ReactNode;
}

export const JobSection: FC<JobProps> = ({ job, index, actions }) => {
	const resumeId = useResumeId();

	return (
		<section className="job">
			<header className="flex items-center justify-between gap-2">
				<InlineEditor
					as="h3"
					path={`data.workExperience.${index}.position`}
					value={job.position}
					resumeId={resumeId}
				/>
				{actions}
			</header>
			<div>
				<InlineEditor
					path={`data.workExperience.${index}.company`}
					value={job.company}
					resumeId={resumeId}
					className="company"
				/>
				<span>{' | '}</span>
				<InlineEditor
					path={`data.workExperience.${index}.location`}
					value={job.location}
					resumeId={resumeId}
					className="location"
				/>
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
