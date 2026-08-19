import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { BlockEditor, type EditorBlock } from './BlockEditor.tsx';

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

function BlockEditorStory({ initialValue }: { initialValue: EditorBlock[] }) {
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
				onTypeChange={(blockId, type) =>
					setBlocks((current) =>
						current.map((block) => (block.id === blockId ? { ...block, type } : block)),
					)
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
