import { z } from 'zod';

export type ChatScope = 'narrative' | 'background' | 'preferences';

export const chatModelSelectionSchema = z.object({
	provider: z.string(),
	model: z.string(),
});

export type ChatModelSelection = z.infer<typeof chatModelSelectionSchema>;

export const chatModelOptionSchema = chatModelSelectionSchema.extend({
	label: z.string(),
	providerLabel: z.string(),
	logoProvider: z.string().optional(),
});

export type ChatModelOption = z.infer<typeof chatModelOptionSchema>;

export const chatModelsResponseSchema = z.object({
	models: z.array(chatModelOptionSchema),
	defaultSelection: chatModelSelectionSchema,
});

export type ChatModelsResponse = z.infer<typeof chatModelsResponseSchema>;

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
