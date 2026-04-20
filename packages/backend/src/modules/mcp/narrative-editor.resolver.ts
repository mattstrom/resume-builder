import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { z } from 'zod';

import { type DeltaOp, CrdtApiService } from '../crdt-client/crdt-api.service';
import { McpGuard } from './mcp.guard';
import { type McpExtra, type McpToolParams } from './types';

const textRunSchema = z.object({
	text: z.string().describe('Text content of this run'),
	marks: z
		.record(z.string(), z.unknown())
		.optional()
		.describe(
			'Inline marks on this run, e.g. { "bold": true, "italic": true }',
		),
});

const insertItemSchema = z.object({
	nodeType: z.enum(['paragraph', 'heading']).describe('Type of block node'),
	attrs: z
		.record(z.string(), z.string())
		.optional()
		.describe('Node attributes, e.g. { "level": "2" } for headings'),
	content: z
		.array(textRunSchema)
		.describe(
			'Text runs making up this node. Use multiple runs to mix plain and marked text, ' +
				'e.g. [{ "text": "Hello " }, { "text": "world", "marks": { "bold": true } }]',
		),
});

const deltaOpSchema = z.union([
	z.object({ retain: z.number().int().describe('Skip N nodes') }),
	z.object({ delete: z.number().int().describe('Delete N nodes') }),
	z.object({
		insert: z
			.array(insertItemSchema)
			.describe('Nodes to insert at current position'),
	}),
]);

const editParamsShape = {
	delta: z
		.array(deltaOpSchema)
		.describe(
			'Sequence of retain/delete/insert ops. Always call read_narrative first. ' +
				'Example — replace node 0 with a bold heading: ' +
				'[{ "delete": 1 }, { "insert": [{ "nodeType": "heading", "attrs": { "level": "1" }, ' +
				'"content": [{ "text": "Hello ", }, { "text": "world", "marks": { "bold": true } }] }] }]',
		),
};

@Resolver()
@UseGuards(McpGuard)
export class NarrativeEditorResolver {
	constructor(private crdtApiService: CrdtApiService) {}

	@Tool({
		name: 'read_narrative',
		description:
			"Read the current user's narrative document. Returns an indexed list of nodes with their content and inline marks, so you can identify positions and reproduce formatting when editing.",
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async readNarrative({ user }: McpExtra): Promise<CallToolResult> {
		const documentName = `profile:${user.sub}`;
		const { nodes } = await this.crdtApiService.readDocument(documentName);
		const text = nodes
			.map(
				(n) =>
					`[${n.index}] ${n.nodeType}${Object.keys(n.attrs).length ? ' ' + JSON.stringify(n.attrs) : ''}: ${JSON.stringify(n.content)}`,
			)
			.join('\n');
		return {
			content: [{ type: 'text', text }],
			structuredContent: { nodes },
		};
	}

	@Tool({
		name: 'edit_narrative',
		description:
			"Apply a delta to the user's narrative document. Changes appear live in the editor. " +
			'Use retain to skip nodes, delete to remove them, and insert to add new ones. ' +
			'Always call read_narrative first.',
		paramsSchema: editParamsShape,
		annotations: {
			destructureHint: false,
			idempotentHint: false,
		},
	})
	async editNarrative(
		{ delta }: McpToolParams<z.infer<z.ZodObject<typeof editParamsShape>>>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const documentName = `profile:${user.sub}`;
		const result = await this.crdtApiService.applyDelta(
			documentName,
			delta as DeltaOp[],
		);
		return {
			content: [
				{
					type: 'text',
					text: `Delta applied. Document now has ${result.length} top-level nodes.`,
				},
			],
			structuredContent: result,
		};
	}
}
