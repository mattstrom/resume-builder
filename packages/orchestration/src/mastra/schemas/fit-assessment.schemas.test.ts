import { describe, expect, it } from 'vitest';

import { analysisSchema } from './fit-assessment.schemas';

const completeAssessment = {
	skillRelevance: 0.8,
	experienceRelevance: 0.7,
	roleLevelFit: 0.9,
	roleLevelFitExplanation:
		'The posting targets Staff scope, which matches the candidate target level.',
	locationFit: 0.6,
	locationFitExplanation:
		'The posting does not state a work model, so the remote preference needs clarification.',
	compensationFit: 0.8,
	compensationFitExplanation:
		'The published range overlaps the candidate target and stays above the stated floor.',
	companyFit: 0.7,
	companyFitExplanation:
		'The growth-stage company and infrastructure domain align with the preferred profile.',
	logisticalFit: 0.75,
	overallFit: 0.76,
	strengths: ['Relevant platform experience'],
	weaknesses: ['Location policy is unclear'],
	recommendations: ['Clarify the work model'],
};

describe('analysisSchema', () => {
	it('requires a granular explanation for every preference-fit score', () => {
		expect(analysisSchema.parse(completeAssessment)).toEqual(completeAssessment);

		expect(
			analysisSchema.safeParse({
				...completeAssessment,
				compensationFitExplanation: undefined,
			}).success,
		).toBe(false);
	});
});
