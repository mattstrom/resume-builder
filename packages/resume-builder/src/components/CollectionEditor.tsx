import { type ReactNode } from 'react';

interface CollectionEditorProps<T> {
	items: T[];
	isSaving?: boolean;
	isEditable?: boolean;
	onAdd: () => Promise<void>;
	onRemove: (index: number) => Promise<void>;
	children: (props: CollectionEditorRenderProps<T>) => ReactNode;
}

export interface CollectionEditorRenderProps<T> {
	items: T[];
	isSaving: boolean;
	isEditable: boolean;
	addItem: () => Promise<void>;
	removeItem: (index: number) => Promise<void>;
}

export const CollectionEditor = <T,>({
	items,
	isSaving = false,
	isEditable = true,
	onAdd,
	onRemove,
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

	return children({
		items,
		isSaving,
		isEditable,
		addItem,
		removeItem,
	});
};
