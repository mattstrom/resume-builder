import type { BlockRendererProps } from '../types.ts';

export function SectionBlock({ block, children }: BlockRendererProps) {
	return (
		<section className="flex min-w-0 flex-1 flex-col gap-3 py-4">
			<header className="px-1">
				<h2 className="text-xl font-semibold tracking-tight">{block.text}</h2>
			</header>
			{children}
		</section>
	);
}
