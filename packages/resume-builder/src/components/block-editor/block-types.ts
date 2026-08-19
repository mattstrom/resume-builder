import {
	Heading1,
	Heading2,
	Heading3,
	Lightbulb,
	List,
	ListOrdered,
	Minus,
	Pilcrow,
	Rows3,
	SquareStack,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { BulletedListBlock } from './blocks/BulletedListBlock.tsx';
import { CalloutBlock } from './blocks/CalloutBlock.tsx';
import { DividerBlock } from './blocks/DividerBlock.tsx';
import { HeadingOneBlock } from './blocks/HeadingOneBlock.tsx';
import { HeadingThreeBlock } from './blocks/HeadingThreeBlock.tsx';
import { HeadingTwoBlock } from './blocks/HeadingTwoBlock.tsx';
import { NumberedListBlock } from './blocks/NumberedListBlock.tsx';
import { ParagraphBlock } from './blocks/ParagraphBlock.tsx';
import { RecordBlock } from './blocks/RecordBlock.tsx';
import { SectionBlock } from './blocks/SectionBlock.tsx';
import type { BlockRendererProps, BlockType } from './types.ts';

export interface BlockTypeDefinition {
	type: BlockType;
	label: string;
	icon: typeof Pilcrow;
	component: ComponentType<BlockRendererProps>;
}

export const blockTypes: BlockTypeDefinition[] = [
	{ type: 'paragraph', label: 'Text', icon: Pilcrow, component: ParagraphBlock },
	{ type: 'heading-1', label: 'Heading 1', icon: Heading1, component: HeadingOneBlock },
	{ type: 'heading-2', label: 'Heading 2', icon: Heading2, component: HeadingTwoBlock },
	{ type: 'heading-3', label: 'Heading 3', icon: Heading3, component: HeadingThreeBlock },
	{ type: 'bullet', label: 'Bulleted list', icon: List, component: BulletedListBlock },
	{
		type: 'numbered-list',
		label: 'Numbered list',
		icon: ListOrdered,
		component: NumberedListBlock,
	},
	{ type: 'callout', label: 'Callout', icon: Lightbulb, component: CalloutBlock },
	{ type: 'divider', label: 'Divider', icon: Minus, component: DividerBlock },
	{ type: 'section', label: 'Section', icon: Rows3, component: SectionBlock },
	{ type: 'record', label: 'Entry', icon: SquareStack, component: RecordBlock },
];

export const blockTypesByName = new Map(
	blockTypes.map((definition) => [definition.type, definition]),
);
