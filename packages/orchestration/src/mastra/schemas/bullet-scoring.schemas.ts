import { z } from 'zod';

const dimensionScoreSchema = z.number().min(0).max(1);

export const bulletScoreSchema = z.object({
	contextScore: dimensionScoreSchema,
	contextNote: z.string().trim().min(1),
	actionScore: dimensionScoreSchema,
	actionNote: z.string().trim().min(1),
	outcomeScore: dimensionScoreSchema,
	outcomeNote: z.string().trim().min(1),
	clarityScore: dimensionScoreSchema,
	clarityNote: z.string().trim().min(1),
});

export type BulletScore = z.infer<typeof bulletScoreSchema>;
