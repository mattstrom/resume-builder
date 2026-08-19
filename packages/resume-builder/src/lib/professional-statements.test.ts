import { describe, expect, it } from 'vitest';

import { parseProfessionalStatementEvaluation } from './professional-statements.ts';

describe('parseProfessionalStatementEvaluation', () => {
	it('parses a complete workflow result', () => {
		const checkpoint = {
			status: 'met',
			score: 0.75,
			confidence: 0.9,
			evidence: ['Software engineer'],
			feedback: 'The role is stated clearly.',
		};
		const result = parseProfessionalStatementEvaluation(
			JSON.stringify({
				overallScore: 0.75,
				summary: 'The statement covers all six checkpoints.',
				checkpoints: {
					whoYouAre: checkpoint,
					yourFoundation: checkpoint,
					whatYouDo: checkpoint,
					yourImpact: checkpoint,
					yourWhy: checkpoint,
					authenticity: checkpoint,
				},
			}),
		);

		expect(result?.checkpoints.whoYouAre.status).toBe('met');
	});

	it('rejects legacy or malformed evaluation data', () => {
		expect(parseProfessionalStatementEvaluation('')).toBeUndefined();
		expect(parseProfessionalStatementEvaluation('{not json')).toBeUndefined();
		expect(
			parseProfessionalStatementEvaluation(JSON.stringify({ checkpoints: [] })),
		).toBeUndefined();
	});
});
