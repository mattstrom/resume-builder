import type { BlockRendererProps } from '../types.ts';

export function RecordBlock({ children }: BlockRendererProps) {
	return (
		<article className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-3 shadow-sm">
			{children}
		</article>
	);
}
