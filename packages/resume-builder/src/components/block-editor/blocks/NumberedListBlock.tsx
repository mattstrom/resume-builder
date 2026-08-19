import { EditableBlockText } from '../EditableBlockText.tsx';
import type { BlockRendererProps, EditorBlock } from '../types.ts';

export function getNumberedListOrdinal(blocks: readonly EditorBlock[], index: number) {
	let ordinal = 1;
	for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
		if (blocks[previousIndex]?.type !== 'numbered-list') break;
		ordinal += 1;
	}
	return ordinal;
}

export function NumberedListBlock({ block, onCommit, numberedListOrdinal }: BlockRendererProps) {
	return (
		<div className="flex min-w-0 flex-1 items-start gap-2">
			<span
				className="min-w-5 pt-1 text-right text-sm leading-6 text-muted-foreground"
				aria-hidden="true"
			>
				{numberedListOrdinal}.
			</span>
			<EditableBlockText
				block={block}
				onCommit={onCommit}
				className="text-sm leading-6"
				multiline
			/>
		</div>
	);
}
