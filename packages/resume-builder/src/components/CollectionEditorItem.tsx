import type { FC, ReactNode } from 'react';
import { ReorderControls } from '@/components/ReorderControls.tsx';

interface CollectionEditorItemProps {
	index: number;
	length: number;
	label: string;
	isEditable?: boolean;
	onMove: (fromIndex: number, toIndex: number) => void;
	actions?: ReactNode;
	children: ReactNode;
}

export const CollectionEditorItem: FC<CollectionEditorItemProps> = ({
	index,
	length,
	label,
	isEditable = true,
	onMove,
	actions,
	children,
}) => {
	return (
		<div>
			<div className="flex items-start gap-2">
				{isEditable ? (
					<ReorderControls
						direction="vertical"
						canMoveBackward={index > 0}
						canMoveForward={index < length - 1}
						onMoveBackward={() => onMove(index, index - 1)}
						onMoveForward={() => onMove(index, index + 1)}
						label={label}
					/>
				) : null}
				<div className="min-w-0 flex-1">{children}</div>
				{actions}
			</div>
		</div>
	);
};
