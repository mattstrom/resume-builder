import { EditableBlockText } from '../EditableBlockText.tsx';
import type { BlockRendererProps } from '../types.ts';

export function ParagraphBlock({ block, onCommit }: BlockRendererProps) {
	return (
		<EditableBlockText
			block={block}
			onCommit={onCommit}
			className="text-sm leading-6"
			multiline
		/>
	);
}
