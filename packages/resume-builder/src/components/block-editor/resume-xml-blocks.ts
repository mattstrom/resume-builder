import type { ResumeXmlElementNode } from '@resume-builder/entities';

import type { BlockType, EditorBlock, EditorBlockBinding } from './types.ts';

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
	{ label: string; text?: AttributeDefinition; attributes: AttributeDefinition[] }
> = {
	job: {
		label: 'role',
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
		attributes: [
			{ name: 'name', label: 'Project name', placeholder: 'Project name', type: 'heading-3' },
			{ name: 'type', label: 'Project type', placeholder: 'Project type', type: 'paragraph' },
		],
	},
	degree: {
		label: 'education',
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
		attributes: [
			{ name: 'name', label: 'Skill group', placeholder: 'Skill group', type: 'heading-3' },
		],
	},
	skill: {
		label: 'skill',
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
