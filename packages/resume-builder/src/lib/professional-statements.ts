import {
	type ProfessionalStatementEvaluation,
	professionalStatementEvaluationSchema,
} from '@resume-builder/entities';

export const professionalStatementCheckpointDefinitions = [
	{
		key: 'whoYouAre',
		label: 'Who you are',
		description: 'Names a clear role, title, or professional identity.',
	},
	{
		key: 'yourFoundation',
		label: 'Your foundation',
		description: 'Establishes relevant experience, background, or domain depth.',
	},
	{
		key: 'whatYouDo',
		label: 'What you do',
		description: 'Names specific, differentiated skills or capabilities.',
	},
	{
		key: 'yourImpact',
		label: 'Your impact',
		description: 'Describes a result, achievement, or observable change.',
	},
	{
		key: 'yourWhy',
		label: 'Your why',
		description: 'States what drives you or the direction you are pursuing.',
	},
	{
		key: 'authenticity',
		label: 'Authenticity',
		description: 'Aligns with evidence in your Professional Compass and profile.',
	},
] as const;

export function parseProfessionalStatementEvaluation(
	value: string,
): ProfessionalStatementEvaluation | undefined {
	if (!value) {
		return undefined;
	}

	try {
		const result = professionalStatementEvaluationSchema.safeParse(JSON.parse(value));
		return result.success ? result.data : undefined;
	} catch {
		return undefined;
	}
}
