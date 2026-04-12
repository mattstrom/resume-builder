import { type MouseEvent, useState } from 'react';
import { useStore } from '@/stores/store.provider.tsx';

export interface InspectRegionHandlers {
	onMouseEnter: (e: MouseEvent) => void;
	onMouseLeave: (e: MouseEvent) => void;
	onClick: (e: MouseEvent) => void;
}

export interface InspectRegionState {
	isInspectMode: boolean;
	isHovered: boolean;
	isSelected: boolean;
	handlers: InspectRegionHandlers;
}

export function useInspectRegion(
	path: string,
	label?: string,
): InspectRegionState {
	const { inspectStore } = useStore();
	const [isHovered, setIsHovered] = useState(false);

	const handlers: InspectRegionHandlers = {
		onMouseEnter: (e) => {
			e.stopPropagation();
			setIsHovered(true);
		},
		onMouseLeave: (e) => {
			e.stopPropagation();
			setIsHovered(false);
		},
		onClick: (e) => {
			e.stopPropagation();
			inspectStore.toggleSelected(path, label);
		},
	};

	return {
		isInspectMode: inspectStore.isInspectMode,
		isHovered,
		isSelected: inspectStore.isHighlighted(path),
		handlers,
	};
}
