import { Node, mergeAttributes } from '@tiptap/core';
import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { type ChangeEvent, type FC } from 'react';

import { cn } from '@/lib/utils';

type JobBlockAttribute =
	| 'position'
	| 'company'
	| 'location'
	| 'startDate'
	| 'endDate'
	| 'narrative';

const JOB_BLOCK_FIELDS: Array<{
	attribute: Exclude<JobBlockAttribute, 'narrative'>;
	label: string;
	placeholder: string;
	wide?: boolean;
}> = [
	{ attribute: 'company', label: 'Company', placeholder: 'Acme, Inc.' },
	{ attribute: 'location', label: 'Location', placeholder: 'San Francisco, CA' },
	{
		attribute: 'position',
		label: 'Position',
		placeholder: 'Senior Product Designer',
	},
];

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		jobBlock: {
			insertJobBlock: () => ReturnType;
		};
	}
}

const JobBlockView: FC<NodeViewProps> = ({ node, updateAttributes }) => {
	const updateField = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		updateAttributes({ [event.target.name]: event.target.value });
	};

	return (
		<NodeViewWrapper className="job-block" data-type="job-block">
			<div className="job-block-tab">Job</div>
			<div className="job-block-fields">
				{JOB_BLOCK_FIELDS.map(({ attribute, label, placeholder, wide }) => (
					<label
						key={attribute}
						className={cn('job-block-field', wide && 'job-block-field-wide')}
					>
						<span>{label}</span>
						<input
							name={attribute}
							type="text"
							value={(node.attrs[attribute] as string) ?? ''}
							onChange={updateField}
							placeholder={placeholder}
						/>
					</label>
				))}
				<div className="job-block-field job-block-date-range" role="group" aria-label="Dates">
					<span>Dates</span>
					<div className="job-block-date-inputs">
						<label>
							<span className="sr-only">Start Date</span>
							<input
								name="startDate"
								type="text"
								value={(node.attrs.startDate as string) ?? ''}
								onChange={updateField}
								placeholder="Start Date"
							/>
						</label>
						<label>
							<span className="sr-only">End Date</span>
							<input
								name="endDate"
								type="text"
								value={(node.attrs.endDate as string) ?? ''}
								onChange={updateField}
								placeholder="End Date"
							/>
						</label>
					</div>
				</div>
				<label className="job-block-field job-block-field-wide">
					<span>Narrative</span>
					<textarea
						name="narrative"
						value={(node.attrs.narrative as string) ?? ''}
						onChange={updateField}
						placeholder="Describe your role, scope, accomplishments, and impact."
						rows={4}
					/>
				</label>
			</div>
		</NodeViewWrapper>
	);
};

export const JobBlock = Node.create({
	name: 'jobBlock',
	group: 'block',
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			position: { default: '' },
			company: { default: '' },
			location: { default: '' },
			startDate: { default: '' },
			endDate: { default: '' },
			narrative: { default: '' },
		};
	},

	parseHTML() {
		return [{ tag: 'section[data-type="job-block"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'section',
			mergeAttributes(HTMLAttributes, { 'data-type': 'job-block' }),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(JobBlockView);
	},

	addCommands() {
		return {
			insertJobBlock:
				() =>
				({ commands }) =>
					commands.insertContent({ type: this.name }),
		};
	},
});
