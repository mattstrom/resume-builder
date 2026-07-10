import { Node, mergeAttributes, type Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { FC } from 'react';

const JOB_FIELD_LABELS = {
	company: 'Company',
	location: 'Location',
	position: 'Position',
	startDate: 'Start Date',
	endDate: 'End Date',
	narrative: 'Narrative',
} as const;

type JobFieldName = keyof typeof JOB_FIELD_LABELS;

const isMonthValue = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const createJobField = (field: JobFieldName) => ({
	type: 'jobField',
	attrs: { field },
});

/**
 * Treat the structured fields in a job block as one small form. ProseMirror
 * normally lets the browser move focus away from the editor on Tab, which
 * makes entering a job cumbersome.
 */
function moveToAdjacentJobField(editor: Editor, direction: 1 | -1): boolean {
	const { $from } = editor.state.selection;
	let jobBlockDepth = -1;
	let currentNode: typeof $from.parent | null = null;

	for (let depth = $from.depth; depth > 0; depth--) {
		const node = $from.node(depth);

		if (
			node.type.name === 'jobField' ||
			node.type.name === 'jobTechnologies' ||
			node.type.name === 'jobNarrative'
		) {
			currentNode = node;
		}

		if (node.type.name === 'jobBlock') {
			jobBlockDepth = depth;
			break;
		}
	}

	if (jobBlockDepth === -1 || !currentNode) {
		return false;
	}

	const jobBlock = $from.node(jobBlockDepth);
	const jobBlockStart = $from.before(jobBlockDepth);
	const targets: Array<{ node: typeof jobBlock; pos: number }> = [];

	jobBlock.descendants((node, pos) => {
		if (node.type.name === 'jobField') {
			targets.push({ node, pos: jobBlockStart + pos + 2 });

			return false;
		}

		if (
			node.type.name === 'jobTechnologies' ||
			node.type.name === 'jobNarrative'
		) {
			// Its first paragraph starts one position into the section node.
			targets.push({ node, pos: jobBlockStart + pos + 3 });

			return false;
		}

		return true;
	});

	const currentIndex = targets.findIndex(({ node }) => node === currentNode);
	const nextTarget = targets[currentIndex + direction];

	if (!nextTarget) {
		return false;
	}

	editor.view.dispatch(
		editor.state.tr.setSelection(
			TextSelection.create(editor.state.doc, nextTarget.pos),
		),
	);

	return true;
}

const JobFieldView: FC<NodeViewProps> = ({ editor, getPos, node }) => {
	const field = node.attrs.field as JobFieldName;
	const isDateField = field === 'startDate' || field === 'endDate';
	const value = node.textContent.trim();

	const setMonth = (month: string) => {
		const position = typeof getPos === 'function' ? getPos() : getPos;
		const from = position + 1;
		const to = position + node.nodeSize - 1;

		editor.view.dispatch(editor.state.tr.insertText(month, from, to));
		editor.commands.focus(from);
	};

	return (
		<NodeViewWrapper
			className={`job-block-field job-block-field-${field}`}
			data-job-field={field}
			data-label={JOB_FIELD_LABELS[field]}
		>
			<NodeViewContent as="div" className="job-block-field-content" />
			{isDateField && (
				<input
					aria-label={`Choose ${JOB_FIELD_LABELS[field].toLowerCase()} month and year`}
					className="job-block-month-picker"
					tabIndex={-1}
					type="month"
					value={isMonthValue(value) ? value : ''}
					onChange={(event) => setMonth(event.target.value)}
				/>
			)}
		</NodeViewWrapper>
	);
};

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
				parseHTML: (element) =>
					element.getAttribute('data-job-field') ?? 'narrative',
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
		return [
			'div',
			mergeAttributes({ class: 'job-block-field' }, HTMLAttributes),
			0,
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(JobFieldView, {
			attrs: ({ node }) => ({
				'data-job-field': String(node.attrs.field),
			}),
		});
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

export const JobTechnologies = Node.create({
	name: 'jobTechnologies',
	group: 'jobBlockContent',
	content: 'block+',
	defining: true,

	parseHTML() {
		return [{ tag: 'div[data-job-technologies]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(
				{
					class: 'job-block-technologies',
					'data-job-technologies': '',
				},
				HTMLAttributes,
			),
			0,
		];
	},
});

export const JobBlock = Node.create({
	name: 'jobBlock',
	group: 'block',
	content:
		'(jobField{3} jobDateRange jobTechnologies? (jobNarrative | jobField)?)?',
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
			[
				'div',
				{ class: 'job-block-tab', contenteditable: 'false' },
				'Job',
			],
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
							createJobField('position'),
							createJobField('location'),
							{
								type: 'jobDateRange',
								content: [
									createJobField('startDate'),
									createJobField('endDate'),
								],
							},
							{
								type: 'jobTechnologies',
								content: [{ type: 'paragraph' }],
							},
							{
								type: 'jobNarrative',
								content: [{ type: 'paragraph' }],
							},
						],
					}),
		};
	},

	addKeyboardShortcuts() {
		return {
			Tab: () => moveToAdjacentJobField(this.editor, 1),
			'Shift-Tab': () => moveToAdjacentJobField(this.editor, -1),
		};
	},
});
