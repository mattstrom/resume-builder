import type { ResumeXmlElementNode, ResumeXmlOp } from '@resume-builder/entities';
import { nanoid } from 'nanoid';

import type { BlockInsertOption, BlockType, EditorBlock, EditorBlockBinding } from './types.ts';

const insertOptionsByParent: Record<string, BlockInsertOption[]> = {
	resume: [
		{ id: 'contact-info', label: 'Contact', type: 'section' },
		{ id: 'education', label: 'Education', type: 'section' },
		{ id: 'work-experience', label: 'Work experience', type: 'section' },
		{ id: 'skills', label: 'Skills', type: 'section' },
		{ id: 'projects', label: 'Projects', type: 'section' },
		{ id: 'volunteer-experiences', label: 'Volunteering', type: 'section' },
	],
	education: [{ id: 'degree', label: 'Education entry', type: 'record' }],
	'work-experience': [{ id: 'job', label: 'Work experience', type: 'record' }],
	skills: [
		{ id: 'skill', label: 'Skill', type: 'bullet' },
		{ id: 'skill-group', label: 'Skill group', type: 'record' },
	],
	projects: [{ id: 'project', label: 'Project', type: 'record' }],
	'volunteer-experiences': [
		{ id: 'volunteering', label: 'Volunteer experience', type: 'record' },
	],
	responsibilities: [{ id: 'responsibility', label: 'Responsibility', type: 'bullet' }],
	items: [{ id: 'item', label: 'Highlight', type: 'bullet' }],
	technologies: [{ id: 'technology', label: 'Technology', type: 'bullet' }],
	'skill-group': [{ id: 'item', label: 'Skill', type: 'bullet' }],
};

const rootElementOrder = [
	'contact-info',
	'headline',
	'summary',
	'education',
	'work-experience',
	'skills',
	'projects',
	'volunteer-experiences',
];

interface AttributeDefinition {
	name: string;
	label: string;
	placeholder: string;
	type: BlockType;
}

const sectionDefinitions: Record<string, { title: string; reorderable: boolean }> = {
	'contact-info': { title: 'Contact', reorderable: false },
	education: { title: 'Education', reorderable: true },
	'work-experience': { title: 'Work Experience', reorderable: true },
	skills: { title: 'Skills', reorderable: true },
	projects: { title: 'Projects', reorderable: true },
	'volunteer-experiences': { title: 'Volunteering', reorderable: true },
	responsibilities: { title: 'Highlights', reorderable: true },
	items: { title: 'Highlights', reorderable: true },
	technologies: { title: 'Technologies', reorderable: true },
};

const recordDefinitions: Record<
	string,
	{
		label: string;
		schemaLabel: string;
		text?: AttributeDefinition;
		attributes: AttributeDefinition[];
	}
> = {
	job: {
		label: 'role',
		schemaLabel: 'Work experience',
		attributes: [
			{ name: 'title', label: 'Position', placeholder: 'Position', type: 'heading-3' },
			{ name: 'company', label: 'Company', placeholder: 'Company', type: 'heading-3' },
			{ name: 'location', label: 'Location', placeholder: 'Location', type: 'paragraph' },
			{
				name: 'start-date',
				label: 'Start date',
				placeholder: 'Start date',
				type: 'paragraph',
			},
			{
				name: 'end-date',
				label: 'End date',
				placeholder: 'End date or Present',
				type: 'paragraph',
			},
		],
	},
	project: {
		label: 'project',
		schemaLabel: 'Project',
		attributes: [
			{ name: 'name', label: 'Project name', placeholder: 'Project name', type: 'heading-3' },
			{ name: 'type', label: 'Project type', placeholder: 'Project type', type: 'paragraph' },
		],
	},
	degree: {
		label: 'education',
		schemaLabel: 'Education',
		attributes: [
			{ name: 'title', label: 'Degree', placeholder: 'Degree', type: 'heading-3' },
			{
				name: 'field',
				label: 'Field of study',
				placeholder: 'Field of study',
				type: 'paragraph',
			},
			{
				name: 'institution',
				label: 'Institution',
				placeholder: 'Institution',
				type: 'paragraph',
			},
			{
				name: 'graduated',
				label: 'Graduation date',
				placeholder: 'Graduation date',
				type: 'paragraph',
			},
		],
	},
	volunteering: {
		label: 'volunteer role',
		schemaLabel: 'Volunteer experience',
		attributes: [
			{
				name: 'title',
				label: 'Volunteer position',
				placeholder: 'Position',
				type: 'heading-3',
			},
			{
				name: 'organization',
				label: 'Organization',
				placeholder: 'Organization',
				type: 'heading-3',
			},
			{ name: 'location', label: 'Location', placeholder: 'Location', type: 'paragraph' },
			{
				name: 'start-date',
				label: 'Start date',
				placeholder: 'Start date',
				type: 'paragraph',
			},
			{
				name: 'end-date',
				label: 'End date',
				placeholder: 'End date or Present',
				type: 'paragraph',
			},
		],
	},
	'skill-group': {
		label: 'skill group',
		schemaLabel: 'Skill group',
		attributes: [
			{ name: 'name', label: 'Skill group', placeholder: 'Skill group', type: 'heading-3' },
		],
	},
	skill: {
		label: 'skill',
		schemaLabel: 'Skill',
		text: { name: '', label: 'Skill', placeholder: 'Skill', type: 'bullet' },
		attributes: [
			{
				name: 'category',
				label: 'Skill category',
				placeholder: 'Category',
				type: 'paragraph',
			},
		],
	},
};

const leafDefinitions: Record<string, { label: string; placeholder: string; type: BlockType }> = {
	name: { label: 'Candidate name', placeholder: 'Candidate name', type: 'heading-1' },
	headline: { label: 'Professional title', placeholder: 'Professional title', type: 'heading-2' },
	summary: {
		label: 'Professional summary',
		placeholder: 'Write a professional summary',
		type: 'paragraph',
	},
	email: { label: 'Email', placeholder: 'Email', type: 'paragraph' },
	phone: { label: 'Phone number', placeholder: 'Phone number', type: 'paragraph' },
	location: { label: 'Location', placeholder: 'Location', type: 'paragraph' },
	github: { label: 'GitHub profile', placeholder: 'GitHub profile', type: 'paragraph' },
	linkedin: { label: 'LinkedIn profile', placeholder: 'LinkedIn profile', type: 'paragraph' },
	'personal-website': {
		label: 'Personal website',
		placeholder: 'Personal website',
		type: 'paragraph',
	},
	description: { label: 'Description', placeholder: 'Add a description', type: 'paragraph' },
	responsibility: { label: 'Responsibility', placeholder: 'Add responsibility', type: 'bullet' },
	item: { label: 'Item', placeholder: 'Add item', type: 'bullet' },
	technology: { label: 'Technology', placeholder: 'Add technology', type: 'bullet' },
};

function attributeBlock(node: ResumeXmlElementNode, definition: AttributeDefinition): EditorBlock {
	return {
		id: `${node.xmlId}::attribute::${definition.name}`,
		type: definition.type,
		text: node.attributes[definition.name] ?? '',
		ariaLabel: definition.label,
		placeholder: definition.placeholder,
		binding: { kind: 'attribute', xmlId: node.xmlId, name: definition.name },
	};
}

function textBlock(node: ResumeXmlElementNode, definition: AttributeDefinition): EditorBlock {
	return {
		id: `${node.xmlId}::text`,
		type: definition.type,
		text: node.text,
		ariaLabel: definition.label,
		placeholder: definition.placeholder,
		binding: { kind: 'text', xmlId: node.xmlId },
	};
}

function childBlocks(node: ResumeXmlElementNode) {
	return node.children.filter((child) => child.xmlId).map(elementBlock);
}

function elementBlock(node: ResumeXmlElementNode): EditorBlock {
	const section = sectionDefinitions[node.name];
	if (section) {
		return {
			id: node.xmlId,
			type: 'section',
			text: section.title,
			ariaLabel: section.title,
			schemaType: node.name,
			schemaLabel: section.title,
			readOnly: true,
			allowChildReorder: section.reorderable,
			children: childBlocks(node),
		};
	}

	const record = recordDefinitions[node.name];
	if (record) {
		return {
			id: node.xmlId,
			type: 'record',
			text: '',
			ariaLabel: record.label,
			schemaType: node.name,
			schemaLabel: record.schemaLabel,
			readOnly: true,
			children: [
				...(record.text ? [textBlock(node, record.text)] : []),
				...record.attributes.map((definition) => attributeBlock(node, definition)),
				...childBlocks(node),
			],
		};
	}

	const leaf = leafDefinitions[node.name] ?? {
		label: node.name,
		placeholder: `Add ${node.name}`,
		type: 'paragraph' as const,
	};
	return {
		id: node.xmlId,
		type: leaf.type,
		text: node.text,
		ariaLabel: leaf.label,
		placeholder: leaf.placeholder,
		binding: { kind: 'text', xmlId: node.xmlId },
		children: childBlocks(node),
	};
}

export function resumeXmlToBlocks(root: ResumeXmlElementNode): EditorBlock[] {
	if (root.name !== 'resume') throw new Error('Expected a resume XML root element');
	return root.children.filter((child) => child.xmlId).map(elementBlock);
}

export function indexBlockBindings(blocks: readonly EditorBlock[]) {
	const bindings = new Map<string, EditorBlockBinding>();
	const visit = (items: readonly EditorBlock[]) => {
		for (const block of items) {
			if (block.binding) bindings.set(block.id, block.binding);
			if (block.children) visit(block.children);
		}
	};
	visit(blocks);
	return bindings;
}

export function findEditorBlock(
	blocks: readonly EditorBlock[],
	blockId: string,
): EditorBlock | undefined {
	for (const block of blocks) {
		if (block.id === blockId) return block;
		const nested = block.children ? findEditorBlock(block.children, blockId) : undefined;
		if (nested) return nested;
	}
	return undefined;
}

function findXmlNode(node: ResumeXmlElementNode, xmlId: string): ResumeXmlElementNode | undefined {
	if (node.xmlId === xmlId) return node;
	for (const child of node.children) {
		const nested = findXmlNode(child, xmlId);
		if (nested) return nested;
	}
	return undefined;
}

function isXmlElementBlock(block: EditorBlock) {
	if (!block.binding) return true;
	return block.binding.kind === 'text' && block.id === block.binding.xmlId;
}

export function getXmlChildInsertIndex(
	blocks: readonly EditorBlock[],
	parentBlockId: string | undefined,
	visualIndex: number,
) {
	const siblings = parentBlockId ? findEditorBlock(blocks, parentBlockId)?.children : blocks;
	return (siblings ?? []).slice(0, visualIndex).filter(isXmlElementBlock).length;
}

export function getResumeXmlInsertOptions(
	root: ResumeXmlElementNode,
	parentXmlId: string,
	childIndex: number,
): readonly BlockInsertOption[] {
	const parent = findXmlNode(root, parentXmlId);
	if (!parent) return [];
	const options = insertOptionsByParent[parent.name] ?? [];
	if (parent.name === 'resume') {
		const previousRank = rootElementOrder.indexOf(parent.children[childIndex - 1]?.name ?? '');
		const nextName = parent.children[childIndex]?.name;
		const nextRank = nextName ? rootElementOrder.indexOf(nextName) : rootElementOrder.length;
		const existing = new Set(parent.children.map((child) => child.name));
		return options.filter((option) => {
			const rank = rootElementOrder.indexOf(option.id);
			return !existing.has(option.id) && rank > previousRank && rank < nextRank;
		});
	}

	// The skills grammar is skill* followed by skill-group*. Filter the menu so
	// the requested slot can never create an out-of-order sequence.
	if (parent.name === 'skills') {
		const before = parent.children.slice(0, childIndex);
		const after = parent.children.slice(childIndex);
		return options.filter((option) => {
			if (option.id === 'skill') {
				return before.every((child) => child.name !== 'skill-group');
			}
			return after.every((child) => child.name !== 'skill');
		});
	}

	return options;
}

function xmlElement(name: string, id: string, content = '', attributes = '') {
	return `<${name} xml:id="${id}"${attributes}>${content}</${name}>`;
}

export function createResumeXmlElement(
	elementName: string,
	createId: () => string = () => `n_${nanoid()}`,
) {
	const leaf = (name: string) => xmlElement(name, createId());
	const container = (name: string) => xmlElement(name, createId());

	switch (elementName) {
		case 'contact-info':
			return xmlElement(
				'contact-info',
				createId(),
				['name', 'email', 'phone', 'location', 'github', 'linkedin', 'personal-website']
					.map(leaf)
					.join(''),
			);
		case 'education':
		case 'work-experience':
		case 'skills':
		case 'projects':
		case 'volunteer-experiences':
			return xmlElement(elementName, createId());
		case 'degree':
			return xmlElement('degree', createId(), leaf('description'));
		case 'job':
			return xmlElement(
				'job',
				createId(),
				leaf('description') + container('responsibilities'),
			);
		case 'project':
			return xmlElement(
				'project',
				createId(),
				leaf('description') + container('items') + container('technologies'),
			);
		case 'volunteering':
			return xmlElement(
				'volunteering',
				createId(),
				leaf('description') + container('responsibilities'),
			);
		case 'skill-group':
			return xmlElement('skill-group', createId());
		case 'skill':
		case 'responsibility':
		case 'item':
		case 'technology':
			return xmlElement(elementName, createId());
		default:
			throw new Error(`Unsupported resume XML element "${elementName}"`);
	}
}

export function createResumeXmlInsertOp(
	root: ResumeXmlElementNode,
	parentXmlId: string,
	childIndex: number,
	elementName: string,
): ResumeXmlOp | undefined {
	const parent = findXmlNode(root, parentXmlId);
	if (!parent) return undefined;
	const nextSibling = parent.children[childIndex];

	return {
		op: 'insertElement',
		target: { xmlId: nextSibling?.xmlId ?? parent.xmlId },
		position: nextSibling ? 'before' : 'append',
		xml: createResumeXmlElement(elementName),
	};
}

export function getMovableXmlChild(
	blocks: readonly EditorBlock[],
	parentId: string,
	index: number,
): EditorBlock | undefined {
	const visit = (items: readonly EditorBlock[]): EditorBlock | undefined => {
		for (const block of items) {
			if (block.id === parentId) return block.children?.[index];
			const nested = block.children ? visit(block.children) : undefined;
			if (nested) return nested;
		}
		return undefined;
	};
	return visit(blocks);
}
