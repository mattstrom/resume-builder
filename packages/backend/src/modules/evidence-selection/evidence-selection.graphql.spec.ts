import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { printSchema } from 'graphql';

import { EvidenceSelectionResolver } from './evidence-selection.resolver.js';

jest.mock('./evidence-selection.service.js', () => ({
	EvidenceSelectionService: class {},
	DEFAULT_EVIDENCE_BUDGET: 18,
}));

/**
 * Decorator mistakes in the GraphQL types surface only when the schema is
 * built, which otherwise means at application bootstrap. Building it here keeps
 * that failure in the test run instead of at deploy time.
 */
describe('evidence selection schema', () => {
	let sdl: string;

	beforeAll(async () => {
		const app = await NestFactory.create(GraphQLSchemaBuilderModule, {
			logger: false,
		});
		await app.init();
		const schema = await app
			.get(GraphQLSchemaFactory)
			.create([EvidenceSelectionResolver]);
		sdl = printSchema(schema);
		await app.close();
	});

	it('exposes planResumeEvidence with a budget default', () => {
		expect(sdl).toContain(
			'planResumeEvidence(applicationId: ID!, budget: Int = 18, status: BulletStatus): EvidenceSelectionPayload!',
		);
	});

	it('splits the gap report into unevidenced and crowded-out requirements', () => {
		expect(sdl).toContain('unevidenced: [RequirementGapType!]!');
		expect(sdl).toContain('crowdedOut: [CrowdedOutGapType!]!');
	});

	it('carries the available evidence ids through gap inheritance', () => {
		expect(sdl).toMatch(
			/type CrowdedOutGapType \{[^}]*conceptId: ID!/s,
		);
		expect(sdl).toMatch(
			/type CrowdedOutGapType \{[^}]*availableEvidenceIds: \[ID!\]!/s,
		);
		expect(sdl).toMatch(/type RequirementGapType \{[^}]*requirementIds: \[ID!\]!/s);
	});
});
