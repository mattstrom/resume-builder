import { EditableBlockText } from '../EditableBlockText.tsx';
import type { BlockRendererProps } from '../types.ts';

export function HeadingOneBlock({ block, onCommit }: BlockRendererProps) {
	return (
		<EditableBlockText
			block={block}
			onCommit={onCommit}
			className="text-3xl font-bold leading-tight tracking-tight"
			singleLine
		/>
	);
}
