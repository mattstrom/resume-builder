export type BlockType =
	| 'heading-1'
	| 'heading-2'
	| 'heading-3'
	| 'paragraph'
	| 'bullet'
	| 'numbered-list'
	| 'callout'
	| 'divider';

export interface EditorBlock {
	id: string;
	type: BlockType;
	text: string;
	placeholder?: string;
	ariaLabel?: string;
	readOnly?: boolean;
}

export interface BlockRendererProps {
	block: EditorBlock;
	onCommit: (value: string) => void;
	numberedListOrdinal: number;
}
