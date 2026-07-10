import { Mark, Node, mergeAttributes, type Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import {
	NodeViewContent,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { FC } from 'react';

type FieldDefinition = {
	name: string;
	label: string;
};

type BlockDefinition = {
	name: string;
	label: string;
	fields: FieldDefinition[];
	narrative?: FieldDefinition;
};

const BLOCK_DEFINITIONS = [
	{
		name: 'educationBlock',
		label: 'Education',
		fields: [
			{ name: 'educationDegree', label: 'Degree' },
			{ name: 'educationField', label: 'Field' },
			{ name: 'educationInstitution', label: 'Institution' },
			{ name: 'educationGraduationDate', label: 'Graduation Date' },
		],
		narrative: { name: 'educationDetails', label: 'Details' },
	},
	{
		name: 'certificateBlock',
		label: 'Certificate',
		fields: [
			{ name: 'certificateName', label: 'Name' },
			{ name: 'certificateInstitution', label: 'Institution' },
		],
	},
	{
		name: 'projectBlock',
		label: 'Project',
		fields: [
			{ name: 'projectName', label: 'Name' },
			{ name: 'projectCompany', label: 'Company' },
			{ name: 'projectType', label: 'Type' },
			{ name: 'projectSkills', label: 'Skills' },
			{ name: 'projectTechnologies', label: 'Technologies' },
		],
	},
	{
		name: 'storyBlock',
		label: 'Story',
		fields: [{ name: 'storyTitle', label: 'Title' }],
		narrative: { name: 'storyNarrative', label: 'Narrative' },
	},
] as const satisfies readonly BlockDefinition[];

const BLOCK_NODE_NAMES = new Set(BLOCK_DEFINITIONS.map(({ name }) => name));
const NARRATIVE_NODE_NAMES = new Set(
	BLOCK_DEFINITIONS.flatMap(({ narrative }) =>
		narrative ? [narrative.name] : [],
	),
);
const FIELD_NODE_NAMES = new Set(
	BLOCK_DEFINITIONS.flatMap(({ fields }) => fields.map(({ name }) => name)),
);
const FIELD_LABELS = new Map(
	BLOCK_DEFINITIONS.flatMap(({ fields }) =>
		fields.map(({ name, label }) => [name, label]),
	),
);

function moveToAdjacentBlockField(editor: Editor, direction: 1 | -1): boolean {
	const { $from } = editor.state.selection;
	let blockDepth = -1;
	let currentNode: typeof $from.parent | null = null;

	for (let depth = $from.depth; depth > 0; depth--) {
		const node = $from.node(depth);
		if (
			FIELD_NODE_NAMES.has(node.type.name) ||
			NARRATIVE_NODE_NAMES.has(node.type.name)
		) {
			currentNode = node;
		}
		if (BLOCK_NODE_NAMES.has(node.type.name)) {
			blockDepth = depth;
			break;
		}
	}

	if (blockDepth === -1 || !currentNode) return false;

	const block = $from.node(blockDepth);
	const blockStart = $from.before(blockDepth);
	const targets: Array<{ node: typeof block; pos: number }> = [];

	block.descendants((node, pos) => {
		if (FIELD_NODE_NAMES.has(node.type.name)) {
			targets.push({ node, pos: blockStart + pos + 2 });
			return false;
		}
		if (NARRATIVE_NODE_NAMES.has(node.type.name)) {
			targets.push({ node, pos: blockStart + pos + 3 });
			return false;
		}
		return true;
	});

	const nextTarget =
		targets[
			targets.findIndex(({ node }) => node === currentNode) + direction
		];
	if (!nextTarget) return false;

	editor.view.dispatch(
		editor.state.tr.setSelection(
			TextSelection.create(editor.state.doc, nextTarget.pos),
		),
	);
	return true;
}

const StructuredFieldView: FC<NodeViewProps> = ({ editor, getPos, node }) => {
	const isProjectType = node.type.name === 'projectType';
	const setValue = (value: string) => {
		const position = typeof getPos === 'function' ? getPos() : getPos;
		editor.view.dispatch(
			editor.state.tr.insertText(
				value,
				position + 1,
				position + node.nodeSize - 1,
			),
		);
		editor.commands.focus(position + 1);
	};

	return (
		<NodeViewWrapper
			className="structured-block-field"
			data-block-field={node.type.name}
			data-label={FIELD_LABELS.get(node.type.name)}
		>
			<NodeViewContent
				as="div"
				className="structured-block-field-content"
			/>
			{isProjectType && (
				<select
					aria-label="Project type"
					className="structured-block-type-picker"
					value={node.textContent.trim()}
					onChange={(event) => setValue(event.target.value)}
				>
					<option value="">Select type</option>
					<option value="Professional">Professional</option>
					<option value="Personal">Personal</option>
				</select>
			)}
		</NodeViewWrapper>
	);
};

const createFieldNode = ({ name, label }: FieldDefinition, group: string) =>
	Node.create({
		name,
		group,
		content: 'inline*',
		defining: true,

		parseHTML() {
			return [{ tag: `div[data-block-field="${name}"]` }];
		},

		renderHTML({ HTMLAttributes }) {
			return [
				'div',
				mergeAttributes(
					{
						class: 'structured-block-field',
						'data-block-field': name,
						'data-label': label,
					},
					HTMLAttributes,
				),
				0,
			];
		},

		addNodeView() {
			return ReactNodeViewRenderer(StructuredFieldView);
		},

		addKeyboardShortcuts() {
			return {
				Tab: () => moveToAdjacentBlockField(this.editor, 1),
				'Shift-Tab': () => moveToAdjacentBlockField(this.editor, -1),
			};
		},
	});

const createNarrativeNode = ({ name, label }: FieldDefinition, group: string) =>
	Node.create({
		name,
		group,
		content: 'block+',
		defining: true,

		parseHTML() {
			return [{ tag: `div[data-block-narrative="${name}"]` }];
		},

		renderHTML({ HTMLAttributes }) {
			return [
				'div',
				mergeAttributes(
					{
						class: 'structured-block-narrative',
						'data-block-narrative': name,
						'data-label': label,
					},
					HTMLAttributes,
				),
				0,
			];
		},

		addKeyboardShortcuts() {
			return {
				Tab: () => moveToAdjacentBlockField(this.editor, 1),
				'Shift-Tab': () => moveToAdjacentBlockField(this.editor, -1),
			};
		},
	});

const createBlockNode = ({ name, label, fields, narrative }: BlockDefinition) =>
	Node.create({
		name,
		group: 'block',
		content: [
			...fields.map(({ name: fieldName }) => fieldName),
			narrative?.name,
		]
			.filter(Boolean)
			.join(' '),
		defining: true,

		parseHTML() {
			return [{ tag: `section[data-block-name="${name}"]` }];
		},

		renderHTML({ HTMLAttributes }) {
			return [
				'section',
				mergeAttributes(
					{ class: 'structured-block', 'data-block-name': name },
					HTMLAttributes,
				),
				[
					'div',
					{ class: 'structured-block-tab', contenteditable: 'false' },
					label,
				],
				['div', { class: 'structured-block-fields' }, 0],
			];
		},
	});

const blockExtensions = BLOCK_DEFINITIONS.flatMap((definition) => {
	const group = `${definition.name}Content`;
	return [
		...definition.fields.map((field) => createFieldNode(field, group)),
		...(definition.narrative
			? [createNarrativeNode(definition.narrative, group)]
			: []),
		createBlockNode(definition),
	];
});

const createBlockContent = (definition: BlockDefinition) => ({
	type: definition.name,
	content: [
		...definition.fields.map(({ name }) => ({ type: name })),
		...(definition.narrative
			? [
					{
						type: definition.narrative.name,
						content: [{ type: 'paragraph' }],
					},
				]
			: []),
	],
});

export const EducationBlockExtensions = blockExtensions.slice(0, 6);
export const CertificateBlockExtensions = blockExtensions.slice(6, 9);
export const ProjectBlockExtensions = blockExtensions.slice(9, 15);
export const LegacySkillBlockExtensions = blockExtensions.slice(15, 18);
export const StoryBlockExtensions = blockExtensions.slice(18, 21);

export const createEducationBlock = () =>
	createBlockContent(BLOCK_DEFINITIONS[0]);
export const createCertificateBlock = () =>
	createBlockContent(BLOCK_DEFINITIONS[1]);
export const createProjectBlock = () =>
	createBlockContent(BLOCK_DEFINITIONS[2]);
export const createStoryBlock = () => createBlockContent(BLOCK_DEFINITIONS[3]);

const SkillGroupNameView: FC<NodeViewProps> = () => (
	<NodeViewWrapper
		as="span"
		className="structured-inline-token structured-inline-token-skillGroupName"
		data-label="Group"
	>
		<NodeViewContent
			as="span"
			className="structured-inline-token-content"
		/>
	</NodeViewWrapper>
);

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		skill: {
			setSkill: () => ReturnType;
			unsetSkill: () => ReturnType;
			toggleSkill: () => ReturnType;
		};
	}
}

const Skill = Mark.create({
	name: 'skill',
	inclusive: false,

	parseHTML() {
		return [{ tag: 'span[data-skill]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes({ 'data-skill': '' }, HTMLAttributes),
			0,
		];
	},

	addCommands() {
		return {
			setSkill:
				() =>
				({ commands }) =>
					commands.setMark(this.name),
			unsetSkill:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
			toggleSkill:
				() =>
				({ commands }) =>
					commands.toggleMark(this.name),
		};
	},
});

const SkillGroupName = Node.create({
	name: 'skillGroupName',
	group: 'inline',
	inline: true,
	content: 'inline*',
	defining: true,
	isolating: true,

	parseHTML() {
		return [{ tag: 'span[data-inline-token="skillGroupName"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(
				{
					class: 'structured-inline-token structured-inline-token-skillGroupName',
					'data-inline-token': 'skillGroupName',
				},
				HTMLAttributes,
			),
			0,
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(SkillGroupNameView);
	},
});

const SkillGroupBlock = Node.create({
	name: 'skillGroupBlock',
	group: 'block',
	content: 'skillGroupName inline*',
	defining: true,

	parseHTML() {
		return [{ tag: 'section[data-block-name="skillGroupBlock"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'section',
			mergeAttributes(
				{
					class: 'structured-block skill-group-block',
					'data-block-name': 'skillGroupBlock',
				},
				HTMLAttributes,
			),
			[
				'div',
				{ class: 'structured-block-tab', contenteditable: 'false' },
				'Skill group',
			],
			['div', { class: 'structured-block-fields' }, 0],
		];
	},
});

export const SkillExtensions = [Skill];
export const SkillGroupBlockExtensions = [SkillGroupName, SkillGroupBlock];

export const createSkillGroupBlock = () => ({
	type: 'skillGroupBlock',
	content: [
		{ type: 'skillGroupName' },
		{ type: 'text', text: 'Skill', marks: [{ type: 'skill' }] },
	],
});

// Kept only to load and remove blocks authored before the schema became
// semantic. New blocks are never inserted with these node names.
const LEGACY_FIELD_LABELS: Record<string, string> = {
	company: 'Company',
	location: 'Location',
	position: 'Position',
	startDate: 'Start Date',
	endDate: 'End Date',
	degree: 'Degree',
	field: 'Field',
	institution: 'Institution',
	graduationDate: 'Graduation Date',
	name: 'Name',
	type: 'Type',
	skills: 'Skills',
	technologies: 'Technologies',
	category: 'Category',
	title: 'Title',
};

const LegacyResumeFieldView: FC<NodeViewProps> = ({ node }) => {
	const field = node.attrs.field as string;
	return (
		<NodeViewWrapper
			className="structured-block-field"
			data-block-field={field}
			data-label={LEGACY_FIELD_LABELS[field] ?? field}
		>
			<NodeViewContent
				as="div"
				className="structured-block-field-content"
			/>
		</NodeViewWrapper>
	);
};

const LegacyResumeField = Node.create({
	name: 'resumeField',
	group: 'resumeBlockContent',
	content: 'inline*',
	defining: true,

	addAttributes() {
		return { field: { default: 'name' } };
	},

	parseHTML() {
		return [{ tag: 'div[data-resume-field]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(
				{ class: 'structured-block-field' },
				HTMLAttributes,
			),
			0,
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(LegacyResumeFieldView);
	},
});

const LegacyResumeNarrative = Node.create({
	name: 'resumeNarrative',
	group: 'resumeBlockContent',
	content: 'block+',
	defining: true,

	parseHTML() {
		return [{ tag: 'div[data-resume-narrative]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(
				{
					class: 'structured-block-narrative',
					'data-resume-narrative': '',
					'data-label': 'Details',
				},
				HTMLAttributes,
			),
			0,
		];
	},
});

const LegacyResumeBlock = Node.create({
	name: 'resumeBlock',
	group: 'block',
	content: '(resumeField | resumeNarrative)+',
	defining: true,

	addAttributes() {
		return { type: { default: 'education' } };
	},

	parseHTML() {
		return [{ tag: 'section[data-resume-block]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'section',
			mergeAttributes(
				{ class: 'structured-block', 'data-resume-block': '' },
				HTMLAttributes,
			),
			[
				'div',
				{ class: 'structured-block-tab', contenteditable: 'false' },
				'Legacy block',
			],
			['div', { class: 'structured-block-fields' }, 0],
		];
	},
});

export const LegacyResumeBlockExtensions = [
	LegacyResumeField,
	LegacyResumeNarrative,
	LegacyResumeBlock,
];
