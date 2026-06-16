import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { z } from 'zod';

export const requestContextSchema = z.object({
	[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	frontend: z.object({
		baseUrl: z.string(),
		previewPath: z.string(),
		exportPath: z.string(),
	}),
});

export type RequestContext = z.infer<typeof requestContextSchema>;
