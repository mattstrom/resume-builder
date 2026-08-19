import { z } from 'zod';

export const professionalStatementCheckpointStatusSchema = z.enum([
	'met',
	'partial',
	'missing',
	'insufficient-context',
]);

export const professionalStatementCheckpointEvaluationSchema = z.object({
	status: professionalStatementCheckpointStatusSchema,
	score: z.number().min(0).max(1),
	confidence: z.number().min(0).max(1),
	evidence: z.array(z.string().trim().min(1)).max(3),
	feedback: z.string().trim().min(1),
});

export const professionalStatementEvaluationSchema = z.object({
	overallScore: z.number().min(0).max(1),
	summary: z.string().trim().min(1),
	checkpoints: z.object({
		whoYouAre: professionalStatementCheckpointEvaluationSchema,
		yourFoundation: professionalStatementCheckpointEvaluationSchema,
		whatYouDo: professionalStatementCheckpointEvaluationSchema,
		yourImpact: professionalStatementCheckpointEvaluationSchema,
		yourWhy: professionalStatementCheckpointEvaluationSchema,
		authenticity: professionalStatementCheckpointEvaluationSchema,
	}),
});

export type ProfessionalStatementCheckpointStatus = z.infer<
	typeof professionalStatementCheckpointStatusSchema
>;
export type ProfessionalStatementCheckpointEvaluation = z.infer<
	typeof professionalStatementCheckpointEvaluationSchema
>;
export type ProfessionalStatementEvaluation = z.infer<typeof professionalStatementEvaluationSchema>;
