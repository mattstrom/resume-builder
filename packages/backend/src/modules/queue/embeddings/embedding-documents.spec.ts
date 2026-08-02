import {
	bulletEmbeddingText,
	conceptEmbeddingText,
	factEmbeddingText,
	jobRequirementEmbeddingText,
} from './embedding-documents.js';

describe('embedding documents', () => {
	it('builds deterministic fact evidence documents', () => {
		const text = factEmbeddingText({
			what: 'Built a platform',
			impact: 'Reduced latency by 40%',
			scale: '10M requests per day',
			concepts: [
				{ relation: 'uses', concept: { label: 'TypeScript' } },
				{ relation: 'demonstrates', concept: { label: 'Architecture' } },
			],
		});

		expect(text).toBe(
			'Built a platform\nReduced latency by 40%\n10M requests per day\n' +
				'demonstrates: Architecture, uses: TypeScript',
		);
	});

	it('aligns job requirements with sorted tags and technologies', () => {
		expect(
			jobRequirementEmbeddingText({
				what: 'Operate distributed services',
				tags: ['Reliability', 'Platform'],
				technologies: ['Kubernetes', 'Go', 'Kubernetes'],
			}),
		).toBe(
			'Operate distributed services\ntags: Platform, Reliability\n' +
				'technologies: Go, Kubernetes',
		);
	});

	it('includes job-matching bullet meanings and excludes entity names', () => {
		const text = bulletEmbeddingText({
			text: 'Improved service reliability',
			concepts: [
				{ relation: 'relates-to', concept: { label: 'Private Employer' } },
				{ relation: 'uses', concept: { label: 'Kubernetes' } },
				{ relation: 'uses', concept: { label: 'Kubernetes' } },
				{ relation: 'demonstrates', concept: { label: 'Incident response' } },
			],
		});

		expect(text).toBe(
			'Improved service reliability\ncapabilities: Incident response\n' +
				'technologies: Kubernetes',
		);
		expect(text).not.toContain('Private Employer');
	});

	it('builds concept documents only from global semantic metadata', () => {
		const text = conceptEmbeddingText({
			vocabulary: 'capability',
			label: 'Technical leadership',
			definition: 'Guides technical direction across a team.',
			aliases: [{ label: 'Tech lead' }, { label: 'Engineering leadership' }],
			outgoingRelations: [
				{ relation: 'broader', targetConcept: { label: 'Leadership' } },
				{ relation: 'related', targetConcept: { label: 'Mentoring' } },
			],
			incomingRelations: [],
		});

		expect(text).toContain('capability: Technical leadership');
		expect(text).toContain('also known as: Engineering leadership, Tech lead');
		expect(text).toContain('broader concepts: Leadership');
		expect(text).toContain('related concepts: Mentoring');
	});
});
