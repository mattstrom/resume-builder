import { EditableBlockText } from '../EditableBlockText.tsx';
import type { BlockRendererProps } from '../types.ts';

export function BulletedListBlock({ block, onCommit }: BlockRendererProps) {
	return (
		<div className="flex min-w-0 flex-1 items-start gap-2">
			<span
				className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-current"
				aria-hidden="true"
			/>
			<EditableBlockText
				block={block}
				onCommit={onCommit}
				className="text-sm leading-6"
				multiline
			/>
		</div>
	);
}
