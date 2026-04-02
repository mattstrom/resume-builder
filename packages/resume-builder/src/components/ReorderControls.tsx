import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button.tsx';

interface ReorderControlsProps {
	direction: 'vertical' | 'horizontal';
	canMoveBackward: boolean;
	canMoveForward: boolean;
	onMoveBackward: () => void;
	onMoveForward: () => void;
	label: string;
}

export const ReorderControls: FC<ReorderControlsProps> = ({
	direction,
	canMoveBackward,
	canMoveForward,
	onMoveBackward,
	onMoveForward,
	label,
}) => {
	const BackwardIcon = direction === 'vertical' ? ArrowUp : ArrowLeft;
	const ForwardIcon = direction === 'vertical' ? ArrowDown : ArrowRight;

	return (
		<span className="inline-flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				onClick={onMoveBackward}
				disabled={!canMoveBackward}
				aria-label={`Move ${label} ${direction === 'vertical' ? 'up' : 'left'}`}
			>
				<BackwardIcon />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				onClick={onMoveForward}
				disabled={!canMoveForward}
				aria-label={`Move ${label} ${direction === 'vertical' ? 'down' : 'right'}`}
			>
				<ForwardIcon />
			</Button>
		</span>
	);
};
