import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

import { CurrentUser } from '../auth/index.js';
import { ConceptEvidenceAssessmentType } from './concept-evidence-assessments.graphql.js';
import { ConceptEvidenceAssessmentsService } from './concept-evidence-assessments.service.js';

@Resolver(() => ConceptEvidenceAssessmentType)
export class ConceptEvidenceAssessmentsResolver {
	constructor(
		private readonly assessmentsService: ConceptEvidenceAssessmentsService,
	) {}

	@Query(() => ConceptEvidenceAssessmentType, { nullable: true })
	async conceptEvidenceAssessment(
		@CurrentUser('sub') uid: string,
		@Args('applicationId', { type: () => ID }) applicationId: string,
		@Args('resumeId', { type: () => ID }) resumeId: string,
	) {
		return this.assessmentsService.find(uid, applicationId, resumeId);
	}

	@Mutation(() => ConceptEvidenceAssessmentType)
	async saveConceptEvidenceAssessment(
		@CurrentUser('sub') uid: string,
		@Args('applicationId', { type: () => ID }) applicationId: string,
		@Args('resumeId', { type: () => ID }) resumeId: string,
		@Args('inputHash') inputHash: string,
		@Args('evaluatorVersion', { type: () => Int }) evaluatorVersion: number,
		@Args('result', { type: () => GraphQLJSON }) result: unknown,
	) {
		return this.assessmentsService.upsert(
			uid,
			applicationId,
			resumeId,
			inputHash,
			evaluatorVersion,
			result,
		);
	}
}
