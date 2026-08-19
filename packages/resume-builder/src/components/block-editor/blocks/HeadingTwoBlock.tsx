import { EditableBlockText } from '../EditableBlockText.tsx';
import type { BlockRendererProps } from '../types.ts';

export function HeadingTwoBlock({ block, onCommit }: BlockRendererProps) {
	return (
		<EditableBlockText
			block={block}
			onCommit={onCommit}
			className="text-xl font-semibold leading-snug tracking-tight"
			singleLine
		/>
	);
}
