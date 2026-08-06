import { describe, expect, it } from 'vitest';

import { evaluateProfessionalStatement } from './professional-statements.ts';

describe('evaluateProfessionalStatement', () => {
	it('recognizes a statement that covers every checkpoint', () => {
		const checkpoints = evaluateProfessionalStatement(
			'I am a software engineer with 12+ years of experience building platforms for 100+ enterprise customers. I am driven to make complex systems easier to use.',
		);

		expect(checkpoints.every(({ met }) => met)).toBe(true);
	});

	it('does not mark checkpoints met for an empty statement', () => {
		const checkpoints = evaluateProfessionalStatement('');

		expect(checkpoints.every(({ met }) => !met)).toBe(true);
	});
});
