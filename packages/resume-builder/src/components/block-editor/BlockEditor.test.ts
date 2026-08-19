import { describe, expect, it } from 'vitest';

import { blockTypes } from './block-types.ts';
import { getNumberedListOrdinal } from './blocks/NumberedListBlock.tsx';
import type { EditorBlock } from './types.ts';

describe('numbered list blocks', () => {
	it('numbers consecutive list items', () => {
		const blocks: EditorBlock[] = [
			{ id: 'one', type: 'numbered-list', text: 'One' },
			{ id: 'two', type: 'numbered-list', text: 'Two' },
			{ id: 'three', type: 'numbered-list', text: 'Three' },
		];

		expect(getNumberedListOrdinal(blocks, 0)).toBe(1);
		expect(getNumberedListOrdinal(blocks, 1)).toBe(2);
		expect(getNumberedListOrdinal(blocks, 2)).toBe(3);
	});

	it('restarts after a different block type', () => {
		const blocks: EditorBlock[] = [
			{ id: 'one', type: 'numbered-list', text: 'One' },
			{ id: 'break', type: 'paragraph', text: 'Break' },
			{ id: 'restart', type: 'numbered-list', text: 'One again' },
		];

		expect(getNumberedListOrdinal(blocks, 2)).toBe(1);
	});
});

describe('block transformations', () => {
	it('registers entries and sections as schema-backed container types', () => {
		expect(blockTypes.find(({ type }) => type === 'section')?.label).toBe('Section');
		expect(blockTypes.find(({ type }) => type === 'record')?.label).toBe('Entry');
	});
});
