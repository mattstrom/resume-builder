import { Separator } from '@/components/ui/separator.tsx';

import type { BlockRendererProps } from '../types.ts';

export function DividerBlock({ block }: BlockRendererProps) {
	return (
		<div className="flex min-h-7 flex-1 items-center px-1">
			<Separator aria-label={block.ariaLabel ?? 'Divider'} />
		</div>
	);
}
