import { registerApiRoute } from '@mastra/core/server';
import { resumeSummarySchema } from '@resume-builder/entities';
import { z } from 'zod';

import config from '@/config';

import { resumeSummarizerAgent } from '../agents/resume-summarizer.agent';

const resumeSummaryRequestSchema = z.object({
	name: z.string(),
	company: z.string(),
	level: z.string().optional(),
	content: z.unknown(),
});

export const resumeSummaryRoute = registerApiRoute('/internal/resume-summary', {
	method: 'POST',
	requiresAuth: false,
	handler: async (context) => {
		const suppliedKey = context.req.header('x-internal-key') ?? '';
		const expectedKey = config.internalApi.key;

		if (!expectedKey && process.env.NODE_ENV === 'production') {
			return context.json({ error: 'Internal API authentication is not configured' }, 503);
		}

		if (expectedKey && suppliedKey !== expectedKey) {
			return context.json({ error: 'Unauthorized' }, 401);
		}

		const input = resumeSummaryRequestSchema.parse(await context.req.json());
		const result = await resumeSummarizerAgent.generate(JSON.stringify(input), {
			structuredOutput: {
				schema: resumeSummarySchema,
				errorStrategy: 'strict',
				jsonPromptInjection: 'auto',
			},
			modelSettings: { maxOutputTokens: 2048 },
		});

		return context.json(resumeSummarySchema.parse(result.object));
	},
});
