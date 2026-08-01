import { z } from 'zod';

const dimensionScoreSchema = z.number().min(0).max(1);
const analysisItemsSchema = z.array(z.string().trim().min(1)).max(3);

export const bulletScoreSchema = z.object({
	contextScore: dimensionScoreSchema,
	contextNote: z.string().trim().min(1),
	contextWhatWorksWell: analysisItemsSchema,
	contextWhyItMatters: z.string().trim().min(1),
	contextProposedEnhancements: analysisItemsSchema,
	actionScore: dimensionScoreSchema,
	actionNote: z.string().trim().min(1),
	actionWhatWorksWell: analysisItemsSchema,
	actionWhyItMatters: z.string().trim().min(1),
	actionProposedEnhancements: analysisItemsSchema,
	outcomeScore: dimensionScoreSchema,
	outcomeNote: z.string().trim().min(1),
	outcomeWhatWorksWell: analysisItemsSchema,
	outcomeWhyItMatters: z.string().trim().min(1),
	outcomeProposedEnhancements: analysisItemsSchema,
	clarityScore: dimensionScoreSchema,
	clarityNote: z.string().trim().min(1),
	clarityWhatWorksWell: analysisItemsSchema,
	clarityWhyItMatters: z.string().trim().min(1),
	clarityProposedEnhancements: analysisItemsSchema,
});

export type BulletScore = z.infer<typeof bulletScoreSchema>;
