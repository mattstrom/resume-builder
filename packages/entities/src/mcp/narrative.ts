import { z } from 'zod';

export const nodeTypes = [
	'paragraph',
	'heading',
	'bulletList',
	'orderedList',
	'listItem',
	'blockquote',
	'codeBlock',
	'horizontalRule',
	'hardBreak',
	'table',
	'tableRow',
	'tableCell',
	'tableHeader',
	'taskList',
	'taskItem',
	'details',
];

export const textRunSchema = z.object({
	text: z.string(),
	marks: z.record(z.string(), z.unknown()).optional(),
});

export const narrativeNodeSchema = z.object({
	index: z.number(),
	nodeType: z.enum(nodeTypes),
	attrs: z.record(z.string(), z.unknown()),
	content: z.array(textRunSchema),
});

export type TextRun = z.infer<typeof textRunSchema>;
export type NarrativeNode = z.infer<typeof narrativeNodeSchema>;

export const insertItemSchema = z.object({
	nodeType: z.enum(nodeTypes),
	attrs: z.record(z.string(), z.string()).optional(),
	content: z.array(textRunSchema),
});

export const deltaOpSchema = z.union([
	z.object({ retain: z.number() }),
	z.object({ delete: z.number() }),
	z.object({ insert: z.array(textRunSchema) }),
]);

export type InsertItem = z.infer<typeof insertItemSchema>;
export type DeltaOp = z.infer<typeof deltaOpSchema>;
