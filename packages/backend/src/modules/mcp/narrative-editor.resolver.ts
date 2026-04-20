import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { z } from 'zod';

import { CrdtApiService } from '../crdt-client/crdt-api.service';
import { McpGuard } from './mcp.guard';
import { type McpExtra, type McpToolParams } from './types';

const insertParamsShape = {
	index: z
		.number()
		.int()
		.describe('Child index in the document fragment. Use -1 to append.'),
	nodeType: z
		.enum(['paragraph', 'heading'])
		.describe('Type of block node to insert'),
	text: z.string().describe('Plain text content of the node'),
	attrs: z
		.record(z.string(), z.string())
		.optional()
		.describe('Node attributes, e.g. { level: "2" } for headings'),
};

@Resolver()
@UseGuards(McpGuard)
export class NarrativeEditorResolver {
	constructor(private crdtApiService: CrdtApiService) {}

	@Tool({
		name: 'read_narrative',
		description:
			"Read the current user's narrative document as XML. Use this to understand the document structure before making edits.",
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async readNarrative({ user }: McpExtra): Promise<CallToolResult> {
		const documentName = `profile:${user.sub}`;
		const { xml } = await this.crdtApiService.readDocument(documentName);
		return {
			content: [{ type: 'text', text: xml }],
			structuredContent: { xml },
		};
	}

	@Tool({
		name: 'insert_into_narrative',
		description:
			"Insert a block node (paragraph or heading) into the user's narrative document at a specific position. Changes appear live in the editor for all collaborators.",
		paramsSchema: insertParamsShape,
		annotations: {
			destructureHint: false,
			idempotentHint: false,
		},
	})
	async insertIntoNarrative(
		{
			index,
			nodeType,
			text,
			attrs,
		}: McpToolParams<z.infer<z.ZodObject<typeof insertParamsShape>>>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const documentName = `profile:${user.sub}`;
		const result = await this.crdtApiService.insertNode(documentName, {
			index,
			nodeType,
			text,
			attrs,
		});
		return {
			content: [
				{
					type: 'text',
					text: `Inserted ${nodeType} at position ${index === -1 ? 'end' : index}. Document now has ${result.length} top-level nodes.`,
				},
			],
			structuredContent: result,
		};
	}
}
