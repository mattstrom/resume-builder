import type { ReactNode } from 'react';

export type BlockType =
	| 'heading-1'
	| 'heading-2'
	| 'heading-3'
	| 'paragraph'
	| 'bullet'
	| 'numbered-list'
	| 'callout'
	| 'divider'
	| 'section'
	| 'record';

export type EditorBlockBinding =
	| { kind: 'text'; xmlId: string }
	| { kind: 'attribute'; xmlId: string; name: string };

export interface EditorBlock {
	id: string;
	type: BlockType;
	text: string;
	placeholder?: string;
	ariaLabel?: string;
	schemaType?: string;
	schemaLabel?: string;
	readOnly?: boolean;
	children?: EditorBlock[];
	allowChildReorder?: boolean;
	binding?: EditorBlockBinding;
}

export interface BlockInsertOption {
	id: string;
	label: string;
	type: BlockType;
}

export interface BlockRendererProps {
	block: EditorBlock;
	onCommit: (value: string) => void;
	numberedListOrdinal: number;
	children?: ReactNode;
}
