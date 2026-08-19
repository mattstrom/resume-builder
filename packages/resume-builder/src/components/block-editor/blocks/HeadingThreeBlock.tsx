import { EditableBlockText } from '../EditableBlockText.tsx';
import type { BlockRendererProps } from '../types.ts';

export function HeadingThreeBlock({ block, onCommit }: BlockRendererProps) {
	return (
		<EditableBlockText
			block={block}
			onCommit={onCommit}
			className="text-base font-semibold leading-snug"
			singleLine
		/>
	);
}
