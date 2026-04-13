import { z } from 'zod';

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
