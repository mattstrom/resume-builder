import { type ReactNode } from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';

interface CollectionEditorProps<T> {
	path: string;
	label?: string;
	items: T[];
	isSaving?: boolean;
	isEditable?: boolean;
	onAdd: () => Promise<void>;
	onRemove: (index: number) => Promise<void>;
	onMove?: (fromIndex: number, toIndex: number) => Promise<void>;
	children: (props: CollectionEditorRenderProps<T>) => ReactNode;
}

export interface CollectionEditorRenderProps<T> {
	items: T[];
	isSaving: boolean;
	isEditable: boolean;
	addItem: () => Promise<void>;
	removeItem: (index: number) => Promise<void>;
	moveItem: (fromIndex: number, toIndex: number) => Promise<void>;
}

export const CollectionEditor = <T,>({
	path,
	label,
	items,
	isSaving = false,
	isEditable = true,
	onAdd,
	onRemove,
	onMove,
	children,
}: CollectionEditorProps<T>) => {
	const addItem = async () => {
		if (!isEditable) {
			return;
		}

		await onAdd();
	};

	const removeItem = async (index: number) => {
		if (!isEditable) {
			return;
		}

		await onRemove(index);
	};

	const moveItem = async (fromIndex: number, toIndex: number) => {
		if (!isEditable || !onMove) {
			return;
		}

		await onMove(fromIndex, toIndex);
	};

	return (
		<HighlightRegion path={path} label={label}>
			{children({
				items,
				isSaving,
				isEditable,
				addItem,
				removeItem,
				moveItem,
			})}
		</HighlightRegion>
	);
};
