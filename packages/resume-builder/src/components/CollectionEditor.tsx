import { type ReactNode } from 'react';

interface CollectionEditorProps<T> {
	items: T[];
	isSaving?: boolean;
	onAdd: () => Promise<void>;
	onRemove: (index: number) => Promise<void>;
	children: (props: CollectionEditorRenderProps<T>) => ReactNode;
}

export interface CollectionEditorRenderProps<T> {
	items: T[];
	isSaving: boolean;
	addItem: () => Promise<void>;
	removeItem: (index: number) => Promise<void>;
}

export const CollectionEditor = <T,>({
	items,
	isSaving = false,
	onAdd,
	onRemove,
	children,
}: CollectionEditorProps<T>) => {
	const addItem = async () => {
		await onAdd();
	};

	const removeItem = async (index: number) => {
		await onRemove(index);
	};

	return children({
		items,
		isSaving,
		addItem,
		removeItem,
	});
};
