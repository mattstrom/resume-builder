import { z } from 'zod';

export type ChatScope = 'narrative' | 'background' | 'preferences';

/**
 * Structured working memory for the chat agent. Shared so the agent's memory
 * config and the client that seeds initial values stay in sync.
 */
export const chatWorkingMemorySchema = z.object({
	applicationId: z.string().nullish(),
	resumeId: z.string().nullish(),
	facts: z.array(z.string()).nullish(),
});

export type ChatWorkingMemory = z.infer<typeof chatWorkingMemorySchema>;
