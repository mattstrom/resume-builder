import { type ChangeEvent, type FC, useState } from 'react';
import { Plus } from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExpandableCard } from '../components/ExpandableCard';

interface Job {
	company: string;
	position: string;
	location: string;
	startDate: string;
	endDate?: string;
	responsibilities: string[];
}

interface WorkExperienceSectionProps {
	jobs: Job[];
	onChange: (jobs: Job[]) => void;
}

export const WorkExperienceSection: FC<WorkExperienceSectionProps> = ({
	jobs,
	onChange,
}) => {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

	const handleAdd = () => {
		onChange([
			...jobs,
			{
				company: '',
				position: '',
				location: '',
				startDate: '',
				endDate: '',
				responsibilities: [],
			},
		]);
		setExpandedIndex(jobs.length);
	};

	const handleDelete = (index: number) => {
		onChange(jobs.filter((_, i) => i !== index));
		if (expandedIndex === index) {
			setExpandedIndex(null);
		}
	};

	const handleChange = (index: number, field: keyof Job) => (
		e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const newJobs = [...jobs];
		if (field === 'responsibilities') {
			newJobs[index][field] = e.target.value
				.split('\n')
				.filter((line) => line.trim());
		} else {
			newJobs[index][field] = e.target.value as any;
		}
		onChange(newJobs);
	};

	const formatJobTitle = (job: Job) => {
		const dates = job.endDate
			? `${job.startDate} - ${job.endDate}`
			: job.startDate
				? `${job.startDate} - Present`
				: '';
		return `${job.position || 'New Position'} at ${job.company || 'Company'} ${dates ? `(${dates})` : ''}`;
	};

	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="work-experience" className="bg-card/5 border-white/10 px-4">
				<AccordionTrigger className="text-sm hover:no-underline">
					Work Experience
				</AccordionTrigger>
				<AccordionContent className="pt-4 space-y-4">
					{jobs.map((job, index) => (
						<ExpandableCard
							key={index}
							title={formatJobTitle(job)}
							expanded={expandedIndex === index}
							onExpandChange={() =>
								setExpandedIndex(expandedIndex === index ? null : index)
							}
							onDelete={() => handleDelete(index)}
						>
							<div className="space-y-2">
								<Label htmlFor={`company-${index}`}>Company</Label>
								<Input
									id={`company-${index}`}
									value={job.company}
									onChange={handleChange(index, 'company')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`position-${index}`}>Position</Label>
								<Input
									id={`position-${index}`}
									value={job.position}
									onChange={handleChange(index, 'position')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`location-${index}`}>Location</Label>
								<Input
									id={`location-${index}`}
									value={job.location}
									onChange={handleChange(index, 'location')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`startDate-${index}`}>Start Date</Label>
								<Input
									id={`startDate-${index}`}
									value={job.startDate}
									onChange={handleChange(index, 'startDate')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`endDate-${index}`}>End Date</Label>
								<Input
									id={`endDate-${index}`}
									value={job.endDate || ''}
									onChange={handleChange(index, 'endDate')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`responsibilities-${index}`}>Responsibilities (one per line)</Label>
								<Textarea
									id={`responsibilities-${index}`}
									value={job.responsibilities.join('\n')}
									onChange={handleChange(index, 'responsibilities')}
									rows={5}
								/>
							</div>
						</ExpandableCard>
					))}
					<Button
						onClick={handleAdd}
						variant="outline"
						size="sm"
						className="mt-4"
					>
						<Plus className="w-4 h-4 mr-2" />
						Add Job
					</Button>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};
