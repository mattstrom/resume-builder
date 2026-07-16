import { BetweenHorizontalEnd, BetweenHorizontalStart } from 'lucide-react';
import { observer } from 'mobx-react';
import type { FC, ReactNode } from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';
import { ReorderControls } from '@/components/ReorderControls.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

interface CollectionEditorItemProps {
	index: number;
	length: number;
	label: string;
	/** Resume data path for this item, enabling it to be highlighted. */
	path?: string;
	isEditable?: boolean;
	controlsPosition?: 'left' | 'right';
	onMove: (fromIndex: number, toIndex: number) => void;
	onInsertAbove?: () => void;
	onInsertBelow?: () => void;
	actions?: ReactNode;
	children: ReactNode;
	/** Stable identifier used by the print paginator. */
	paginationUnit?: string;
}

export const CollectionEditorItem: FC<CollectionEditorItemProps> = observer(
	({
		index,
		length,
		label,
		path,
		isEditable = true,
		controlsPosition = 'right',
		onMove,
		onInsertAbove,
		onInsertBelow,
		actions,
		children,
		paginationUnit,
	}) => {
		const content = <div className="min-w-0">{children}</div>;

		return (
			<div className="group relative" data-pagination-unit={paginationUnit}>
				{path ? (
					<HighlightRegion
						path={path}
						label={`${label.charAt(0).toUpperCase()}${label.slice(1)} ${index + 1}`}
					>
						{content}
					</HighlightRegion>
				) : (
					content
				)}
				{isEditable ? (
					<div
						className={cn(
							'absolute top-0 z-10 flex items-center gap-1 rounded-md border border-border bg-popover/95 px-1 py-0.5 opacity-0 shadow-md transition-opacity focus-within:opacity-100 group-hover:opacity-100',
							controlsPosition === 'left' ? 'right-full mr-1' : 'right-0',
						)}
					>
						{onInsertAbove ? (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={onInsertAbove}
								aria-label={`Insert ${label} above`}
								title={`Insert ${label} above`}
							>
								<BetweenHorizontalStart />
							</Button>
						) : null}
						<ReorderControls
							direction="vertical"
							canMoveBackward={index > 0}
							canMoveForward={index < length - 1}
							onMoveBackward={() => onMove(index, index - 1)}
							onMoveForward={() => onMove(index, index + 1)}
							label={label}
						/>
						{onInsertBelow ? (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={onInsertBelow}
								aria-label={`Insert ${label} below`}
								title={`Insert ${label} below`}
							>
								<BetweenHorizontalEnd />
							</Button>
						) : null}
						{actions}
					</div>
				) : null}
			</div>
		);
	},
);
