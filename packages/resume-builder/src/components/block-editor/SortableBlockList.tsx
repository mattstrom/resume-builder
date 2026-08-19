import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { useState } from 'react';

import { cn } from '@/lib/utils.ts';

export interface SortableBlockItem {
	id: string;
}

export interface SortableBlockRenderProps {
	dragHandleProps: HTMLAttributes<HTMLElement> & {
		draggable: true;
	};
	isDragging: boolean;
	moveBackward: () => void;
	moveForward: () => void;
	canMoveBackward: boolean;
	canMoveForward: boolean;
}

interface SortableBlockListProps<T extends SortableBlockItem> {
	items: readonly T[];
	onMove?: (fromIndex: number, toIndex: number) => void;
	children: (item: T, index: number, props: SortableBlockRenderProps) => ReactNode;
	className?: string;
	itemClassName?: string;
	ariaLabel?: string;
}

export function getBlockDropSlot(
	itemIndex: number,
	pointerY: number,
	itemTop: number,
	itemHeight: number,
) {
	return pointerY < itemTop + itemHeight / 2 ? itemIndex : itemIndex + 1;
}

export function getBlockMoveTarget(sourceIndex: number, dropSlot: number) {
	return sourceIndex < dropSlot ? dropSlot - 1 : dropSlot;
}

export function SortableBlockList<T extends SortableBlockItem>({
	items,
	onMove,
	children,
	className,
	itemClassName,
	ariaLabel = 'Reorderable blocks',
}: SortableBlockListProps<T>) {
	const [draggedId, setDraggedId] = useState<string>();
	const [dropSlot, setDropSlot] = useState<number>();

	const sourceIndex = draggedId ? items.findIndex((item) => item.id === draggedId) : -1;

	const finishDrag = () => {
		setDraggedId(undefined);
		setDropSlot(undefined);
	};

	const moveToSlot = (slot: number) => {
		if (sourceIndex < 0) return;
		const targetIndex = getBlockMoveTarget(sourceIndex, slot);
		if (targetIndex !== sourceIndex) {
			onMove?.(sourceIndex, targetIndex);
		}
	};

	return (
		<div className={cn('flex flex-col', className)} aria-label={ariaLabel}>
			{items.map((item, index) => {
				const isLastItem = index === items.length - 1;
				const move = (toIndex: number) => {
					if (toIndex >= 0 && toIndex < items.length) {
						onMove?.(index, toIndex);
					}
				};
				const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
					if (!(event.altKey || event.metaKey || event.ctrlKey)) return;
					if (event.key === 'ArrowUp' && index > 0) {
						event.preventDefault();
						move(index - 1);
					}
					if (event.key === 'ArrowDown' && index < items.length - 1) {
						event.preventDefault();
						move(index + 1);
					}
				};

				return (
					<div
						key={item.id}
						className={cn(
							'relative transition-[opacity,transform]',
							draggedId === item.id && 'opacity-45',
							dropSlot === index &&
								'before:pointer-events-none before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:rounded-full before:bg-primary before:shadow-sm',
							isLastItem &&
								dropSlot === items.length &&
								'after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary after:shadow-sm',
							itemClassName,
						)}
						onDragOver={(event) => {
							if (sourceIndex < 0) return;
							event.preventDefault();
							event.stopPropagation();
							event.dataTransfer.dropEffect = 'move';
							const bounds = event.currentTarget.getBoundingClientRect();
							setDropSlot(
								getBlockDropSlot(index, event.clientY, bounds.top, bounds.height),
							);
						}}
						onDrop={(event) => {
							if (sourceIndex < 0) return;
							event.preventDefault();
							event.stopPropagation();
							const bounds = event.currentTarget.getBoundingClientRect();
							const slot = getBlockDropSlot(
								index,
								event.clientY,
								bounds.top,
								bounds.height,
							);
							moveToSlot(slot);
							finishDrag();
						}}
					>
						{children(item, index, {
							dragHandleProps: {
								draggable: true,
								onDragStart: (event) => {
									event.dataTransfer.effectAllowed = 'move';
									// Firefox requires drag data to be set before it starts. The
									// source of truth remains local state because Safari withholds
									// drag data while handling dragover events.
									event.dataTransfer.setData('text/plain', item.id);
									setDraggedId(item.id);
								},
								onDragEnd: finishDrag,
								onKeyDown: handleKeyDown,
							},
							isDragging: draggedId === item.id,
							moveBackward: () => move(index - 1),
							moveForward: () => move(index + 1),
							canMoveBackward: index > 0,
							canMoveForward: index < items.length - 1,
						})}
					</div>
				);
			})}
		</div>
	);
}
