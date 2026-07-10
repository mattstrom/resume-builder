import { Node, mergeAttributes } from '@tiptap/core';

const JOB_FIELD_LABELS = {
	company: 'Company',
	location: 'Location',
	position: 'Position',
	startDate: 'Start Date',
	endDate: 'End Date',
	narrative: 'Narrative',
} as const;

type JobFieldName = keyof typeof JOB_FIELD_LABELS;

const createJobField = (field: JobFieldName) => ({
	type: 'jobField',
	attrs: { field },
});

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		jobBlock: {
			insertJobBlock: () => ReturnType;
		};
	}
}

export const JobField = Node.create({
	name: 'jobField',
	group: 'jobBlockContent',
	content: 'inline*',
	defining: true,

	addAttributes() {
		return {
			field: {
				default: 'narrative',
				parseHTML: (element) => element.getAttribute('data-job-field') ?? 'narrative',
				renderHTML: (attributes) => {
					const field = attributes.field as JobFieldName;

					return {
						'data-job-field': field,
						'data-label': JOB_FIELD_LABELS[field],
					};
				},
			},
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-job-field]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes({ class: 'job-block-field' }, HTMLAttributes), 0];
	},
});

export const JobDateRange = Node.create({
	name: 'jobDateRange',
	group: 'jobBlockContent',
	content: 'jobField{2}',
	defining: true,

	parseHTML() {
		return [{ tag: 'div[data-job-date-range]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(
				{ class: 'job-block-date-range', 'data-job-date-range': '' },
				HTMLAttributes,
			),
			0,
		];
	},
});

export const JobNarrative = Node.create({
	name: 'jobNarrative',
	group: 'jobBlockContent',
	content: 'block+',
	defining: true,

	parseHTML() {
		return [{ tag: 'div[data-job-narrative]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(
				{ class: 'job-block-narrative', 'data-job-narrative': '' },
				HTMLAttributes,
			),
			0,
		];
	},
});

export const JobBlock = Node.create({
	name: 'jobBlock',
	group: 'block',
	content: '(jobField{3} jobDateRange (jobNarrative | jobField))?',
	defining: true,

	parseHTML() {
		return [{ tag: 'section[data-type="job-block"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'section',
			mergeAttributes(HTMLAttributes, {
				class: 'job-block',
				'data-type': 'job-block',
			}),
			['div', { class: 'job-block-tab', contenteditable: 'false' }, 'Job'],
			['div', { class: 'job-block-fields' }, 0],
		];
	},

	addCommands() {
		return {
			insertJobBlock:
				() =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						content: [
							createJobField('company'),
							createJobField('location'),
							createJobField('position'),
							{
								type: 'jobDateRange',
								content: [createJobField('startDate'), createJobField('endDate')],
							},
							{
								type: 'jobNarrative',
								content: [{ type: 'paragraph' }],
							},
						],
					}),
		};
	},
});
