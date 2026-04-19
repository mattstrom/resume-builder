import { Prompt, Resolver, UseGuards } from '@nestjs-mcp/server';
import type { PromptHandlerArgs } from '@nestjs-mcp/server';
import { z } from 'zod';

import { FIT_ASSESSOR_SYSTEM_PROMPT } from '../../queue/job-assessment/fit-assessor.rubric';
import { McpGuard } from '../mcp.guard';

@Resolver()
@UseGuards(McpGuard)
export class FitAssessorPromptResolver {
	@Prompt({
		name: 'fit-assessor',
		description:
			'Assess how well a job description matches your skills, experience, and career preferences. Provide a job description as text or URL.',
		argsSchema: {
			jobDescription: z
				.string()
				.describe(
					'Job description text, or the URL of the job posting',
				),
		},
	})
	fitAssessor({ args }: PromptHandlerArgs) {
		const jd = (args as { jobDescription: string }).jobDescription;
		return {
			messages: [
				{
					role: 'user' as const,
					content: {
						type: 'text' as const,
						text: `${FIT_ASSESSOR_SYSTEM_PROMPT}\n\nJob Description:\n${jd}`,
					},
				},
			],
		};
	}
}
