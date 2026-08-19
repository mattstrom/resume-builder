import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { BlockEditor, type EditorBlock } from './BlockEditor.tsx';
import type { BlockInsertOption } from './types.ts';

const initialBlocks: EditorBlock[] = [
	{ id: 'name', type: 'heading-1', text: 'Jordan Taylor', placeholder: 'Your name' },
	{ id: 'title', type: 'heading-2', text: 'Product Designer', placeholder: 'Professional title' },
	{ id: 'section', type: 'heading-3', text: 'Selected impact' },
	{
		id: 'summary',
		type: 'paragraph',
		text: 'Designer focused on clear systems and useful details.',
	},
	{ id: 'bullet-1', type: 'bullet', text: 'Built a reusable design system used by six teams.' },
	{ id: 'bullet-2', type: 'bullet', text: 'Reduced onboarding time by 35%.' },
	{ id: 'step-1', type: 'numbered-list', text: 'Audit the existing experience.' },
	{ id: 'step-2', type: 'numbered-list', text: 'Prototype and test the improved flow.' },
	{
		id: 'callout',
		type: 'callout',
		text: 'Open to product design and design systems roles.',
	},
	{ id: 'divider', type: 'divider', text: '', ariaLabel: 'End of resume' },
];

function BlockEditorStory({
	initialValue,
	getInsertOptions,
}: {
	initialValue: EditorBlock[];
	getInsertOptions?: (blocks: readonly EditorBlock[], index: number) => BlockInsertOption[];
}) {
	const [blocks, setBlocks] = useState(initialValue);
	return (
		<div className="mx-auto max-w-2xl rounded-xl border bg-background p-8 shadow-sm">
			<BlockEditor
				blocks={blocks}
				onChange={(blockId, text) =>
					setBlocks((current) =>
						current.map((block) => (block.id === blockId ? { ...block, text } : block)),
					)
				}
				onMove={(fromIndex, toIndex) =>
					setBlocks((current) => {
						const next = [...current];
						const [moved] = next.splice(fromIndex, 1);
						if (moved) next.splice(toIndex, 0, moved);
						return next;
					})
				}
				onTypeChange={(blockId, type, schemaType) =>
					setBlocks((current) =>
						current.map((block) =>
							block.id === blockId
								? {
										...block,
										type,
										ariaLabel: schemaType ?? block.ariaLabel,
										schemaType,
										schemaLabel: schemaType,
										children:
											type === 'record' || type === 'section'
												? (block.children ?? [])
												: undefined,
									}
								: block,
						),
					)
				}
				getInsertOptions={
					getInsertOptions
						? (parentBlockId, index) =>
								parentBlockId ? [] : getInsertOptions(blocks, index)
						: undefined
				}
				onInsert={(_, index, option) =>
					setBlocks((current) => {
						const next = [...current];
						next.splice(index, 0, {
							id: `${option.id}-${crypto.randomUUID()}`,
							type: option.type,
							text: '',
							ariaLabel: option.label,
							schemaType:
								option.type === 'record' || option.type === 'section'
									? option.id
									: undefined,
							schemaLabel:
								option.type === 'record' || option.type === 'section'
									? option.label
									: undefined,
							placeholder: `Add ${option.label.toLowerCase()}…`,
							children:
								option.type === 'record' || option.type === 'section'
									? []
									: undefined,
						});
						return next;
					})
				}
			/>
		</div>
	);
}

const meta = {
	title: 'Editors/BlockEditor',
	component: BlockEditor,
	parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BlockEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function storyFor(blocks: EditorBlock[]): Story {
	return {
		args: {
			blocks,
			onChange: () => undefined,
		},
		render: () => <BlockEditorStory initialValue={blocks} />,
	};
}

export const ResumeContent: Story = storyFor(initialBlocks);

export const SchemaAwareInsertion: Story = {
	args: { blocks: initialBlocks, onChange: () => undefined },
	render: () => (
		<BlockEditorStory
			initialValue={[
				{ id: 'skill-1', type: 'bullet', text: 'TypeScript' },
				{ id: 'skill-2', type: 'bullet', text: 'Design systems' },
				{ id: 'group-1', type: 'record', text: 'Frontend', children: [] },
			]}
			getInsertOptions={(blocks, index) => {
				const before = blocks.slice(0, index);
				const after = blocks.slice(index);
				return [
					...(before.every((block) => block.type !== 'record')
						? [{ id: 'skill', label: 'Skill', type: 'bullet' as const }]
						: []),
					...(after.every((block) => block.type !== 'bullet')
						? [{ id: 'skill-group', label: 'Skill group', type: 'record' as const }]
						: []),
				];
			}}
		/>
	),
};

export const SchemaAwareSectionInsertion: Story = {
	args: { blocks: initialBlocks, onChange: () => undefined },
	render: () => (
		<BlockEditorStory
			initialValue={[
				{
					id: 'contact',
					type: 'section',
					text: 'Contact',
					readOnly: true,
					children: [],
				},
				{
					id: 'work',
					type: 'section',
					text: 'Work experience',
					readOnly: true,
					children: [],
				},
			]}
			getInsertOptions={(_, index) =>
				index === 1 ? [{ id: 'education', label: 'Education', type: 'section' }] : []
			}
		/>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const page = within(canvasElement.ownerDocument.body);
		const [contactActions] = canvas.getAllByRole('button', {
			name: 'Open details and actions for block',
		});

		await userEvent.click(contactActions);

		const insertAbove = await page.findByText('Insert above');
		const insertBelow = await page.findByText('Insert below');

		expect(insertAbove).toHaveAttribute('data-disabled');
		expect(insertBelow).not.toHaveAttribute('data-disabled');
		expect(insertBelow).toHaveAttribute('data-state', 'closed');
	},
};

export const HeadingOne: Story = storyFor([
	{ id: 'heading-1', type: 'heading-1', text: 'Jordan Taylor', placeholder: 'Heading 1' },
]);

export const HeadingTwo: Story = storyFor([
	{ id: 'heading-2', type: 'heading-2', text: 'Product Designer', placeholder: 'Heading 2' },
]);

export const HeadingThree: Story = storyFor([
	{ id: 'heading-3', type: 'heading-3', text: 'Selected impact', placeholder: 'Heading 3' },
]);

export const Paragraph: Story = storyFor([
	{
		id: 'paragraph',
		type: 'paragraph',
		text: 'Designer focused on clear systems and useful details.',
		placeholder: 'Start writing…',
	},
]);

export const BulletedList: Story = storyFor([
	{ id: 'bullet-1', type: 'bullet', text: 'Built a reusable design system.' },
	{ id: 'bullet-2', type: 'bullet', text: 'Reduced onboarding time by 35%.' },
	{ id: 'bullet-3', type: 'bullet', text: 'Mentored three product designers.' },
]);

export const NumberedList: Story = storyFor([
	{ id: 'number-1', type: 'numbered-list', text: 'Audit the existing experience.' },
	{ id: 'number-2', type: 'numbered-list', text: 'Prototype the improved flow.' },
	{ id: 'number-3', type: 'numbered-list', text: 'Test and iterate with customers.' },
]);

export const Callout: Story = storyFor([
	{
		id: 'callout',
		type: 'callout',
		text: 'Open to product design and design systems roles.',
		placeholder: 'Add a callout…',
	},
]);

export const Divider: Story = storyFor([
	{ id: 'divider', type: 'divider', text: '', ariaLabel: 'Section divider' },
]);

export const Section: Story = storyFor([
	{
		id: 'experience',
		type: 'section',
		text: 'Work Experience',
		readOnly: true,
		children: [
			{ id: 'role', type: 'heading-3', text: 'Staff Engineer' },
			{ id: 'impact', type: 'bullet', text: 'Reduced build time by 40%.' },
		],
	},
]);

export const Record: Story = storyFor([
	{
		id: 'job',
		type: 'record',
		text: '',
		readOnly: true,
		children: [
			{ id: 'title', type: 'heading-3', text: 'Staff Engineer' },
			{ id: 'company', type: 'heading-3', text: 'Acme' },
			{ id: 'dates', type: 'paragraph', text: '2022–Present' },
		],
	},
]);
