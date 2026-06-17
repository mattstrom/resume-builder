import { BetweenHorizontalEnd, BetweenHorizontalStart } from 'lucide-react';
import { observer } from 'mobx-react';
import type { FC, ReactNode } from 'react';

import { ReorderControls } from '@/components/ReorderControls.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useStore } from '@/stores/store.provider.tsx';

interface CollectionEditorItemProps {
	index: number;
	length: number;
	label: string;
	isEditable?: boolean;
	onMove: (fromIndex: number, toIndex: number) => void;
	onInsertAbove?: () => void;
	onInsertBelow?: () => void;
	actions?: ReactNode;
	children: ReactNode;
}

export const CollectionEditorItem: FC<CollectionEditorItemProps> = observer(
	({
		index,
		length,
		label,
		isEditable = true,
		onMove,
		onInsertAbove,
		onInsertBelow,
		actions,
		children,
	}) => {
		const { listEditStore } = useStore();

		return (
			<div className="group relative">
				<div className="min-w-0">{children}</div>
				{isEditable && !listEditStore.isActive ? (
					<div className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-md border border-border bg-popover/95 px-1 py-0.5 opacity-0 shadow-md transition-opacity focus-within:opacity-100 group-hover:opacity-100">
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
