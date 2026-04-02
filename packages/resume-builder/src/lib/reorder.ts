export function reorderItems<T>(
	items: readonly T[],
	fromIndex: number,
	toIndex: number,
): T[] {
	if (
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= items.length ||
		toIndex >= items.length ||
		fromIndex === toIndex
	) {
		return [...items];
	}

	const nextItems = [...items];
	const [item] = nextItems.splice(fromIndex, 1);

	if (item === undefined) {
		return [...items];
	}

	nextItems.splice(toIndex, 0, item);
	return nextItems;
}
