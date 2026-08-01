import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { BulletSourceType, BulletStatus } from '@resume-builder/entities';
import { z } from 'zod';

import { BulletsService } from '../entities/bullets/bullets.service.js';
import { McpGuard } from './mcp.guard.js';
import type { McpExtra, McpToolParams } from './types.js';

@Resolver()
@UseGuards(McpGuard)
export class BulletsResolver {
	constructor(private readonly bulletsService: BulletsService) {}

	@Tool({
		name: 'get_bullets',
		description:
			'Retrieve resume bullets for the current user, optionally filtered by source or status',
		paramsSchema: {
			sourceType: z.enum(BulletSourceType).optional(),
			sourceId: z.string().optional(),
			status: z.enum(BulletStatus).optional(),
			search: z.string().optional(),
			includeArchived: z.boolean().optional(),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getBullets(
		filter: McpToolParams<{
			sourceType?: BulletSourceType;
			sourceId?: string;
			status?: BulletStatus;
			search?: string;
			includeArchived?: boolean;
		}>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const bullets = await this.bulletsService.findAll(user.sub, filter);
		return {
			content: [{ type: 'text', text: `Found ${bullets.length} bullets.` }],
			structuredContent: { bullets },
		};
	}

	@Tool({
		name: 'get_bullet',
		description: 'Retrieve one resume bullet owned by the current user',
		paramsSchema: { id: z.string().describe('Bullet ID') },
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getBullet(
		{ id }: McpToolParams<{ id: string }>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const bullet = await this.bulletsService.find(user.sub, id);
		return {
			content: [{ type: 'text', text: `Found bullet ${id}.` }],
			structuredContent: { bullet },
		};
	}
}
