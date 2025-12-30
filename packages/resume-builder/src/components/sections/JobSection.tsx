import { type FC, type PropsWithChildren } from 'react';
import type { Job } from '../../types.ts';

interface JobProps extends PropsWithChildren {
	job: Job;
}

export const JobSection: FC<JobProps> = ({ job }) => {
	return (
		<section className='job'>
			<header>
				<h3>{job.position}</h3>
			</header>
			<div>
				<span className='company'>{job.company}</span>
				<span>|</span>
				<span className='location'>{job.location}</span>
				<span>|</span>
				<time>
					<span className='start-date'>{job.startDate}</span>
					{'–'}
					<span className='end-date'>{job.endDate}</span>
				</time>
			</div>
			{job.responsibilities && (
				<ul className='responsibilities'>
					{job.responsibilities.map((item, index) => (
						<li key={index}>{item}</li>
					))}
				</ul>
			)}
		</section>
	);
};
