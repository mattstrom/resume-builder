import type { BlockRendererProps } from '../types.ts';

export function RecordBlock({ children }: BlockRendererProps) {
	return (
		<article className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border bg-background px-3 py-3 text-foreground shadow-sm">
			{children}
		</article>
	);
}
