import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { BulletStatus } from '@resume-builder/entities';
import { z } from 'zod';

import {
	DEFAULT_EVIDENCE_BUDGET,
	EvidenceSelectionService,
} from '../evidence-selection/evidence-selection.service.js';
import { McpGuard } from './mcp.guard.js';
import type { McpExtra, McpToolParams } from './types.js';

@Resolver()
@UseGuards(McpGuard)
export class EvidenceSelectionResolver {
	constructor(
		private readonly evidenceSelection: EvidenceSelectionService,
	) {}

	@Tool({
		name: 'plan_resume_evidence',
		description:
			'Select the bullets that best cover an application\'s requirements within a budget, and report which requirements are left uncovered',
		paramsSchema: {
			applicationId: z.string().trim().min(1),
			budget: z.number().int().min(1).max(100).optional(),
			status: z.nativeEnum(BulletStatus).optional(),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async planResumeEvidence(
		{
			applicationId,
			budget,
			status,
		}: McpToolParams<{
			applicationId: string;
			budget?: number;
			status?: BulletStatus;
		}>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const plan = await this.evidenceSelection.planForApplication(
			user.sub,
			applicationId,
			budget ?? DEFAULT_EVIDENCE_BUDGET,
			status,
		);

		return {
			content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }],
			structuredContent: plan,
		};
	}
}
