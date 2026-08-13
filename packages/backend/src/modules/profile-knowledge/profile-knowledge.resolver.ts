import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

import { CurrentUser } from '../auth/index.js';
import {
	ProfileKnowledgeInboxItemType,
	ProfileKnowledgeProposalType,
	RequirementGradeFeedbackType,
} from './profile-knowledge.graphql.js';
import { ProfileKnowledgeService } from './profile-knowledge.service.js';

@Resolver()
export class ProfileKnowledgeResolver {
	constructor(private readonly profileKnowledgeService: ProfileKnowledgeService) {}

	@Query(() => [RequirementGradeFeedbackType])
	requirementGradeFeedback(
		@CurrentUser('sub') uid: string,
		@Args('applicationId', { type: () => ID }) applicationId: string,
	) {
		return this.profileKnowledgeService.findFeedback(uid, applicationId);
	}

	@Query(() => [String])
	profileKnowledgeGuidance(@CurrentUser('sub') uid: string) {
		return this.profileKnowledgeService.acceptedGuidance(uid);
	}

	@Query(() => [ProfileKnowledgeInboxItemType])
	profileKnowledgeInbox(@CurrentUser('sub') uid: string) {
		return this.profileKnowledgeService.findInbox(uid);
	}

	@Mutation(() => RequirementGradeFeedbackType)
	recordRequirementGradeFeedback(
		@CurrentUser('sub') uid: string,
		@Args('applicationId', { type: () => ID }) applicationId: string,
		@Args('jobRequirementId', { type: () => ID }) jobRequirementId: string,
		@Args('agentGrade') agentGrade: string,
		@Args('manualGrade', { type: () => String, nullable: true }) manualGrade?: string,
		@Args('explanation', { type: () => String, nullable: true }) explanation?: string,
	) {
		return this.profileKnowledgeService.recordFeedback(
			uid,
			applicationId,
			jobRequirementId,
			agentGrade,
			manualGrade ?? null,
			explanation,
		);
	}

	@Mutation(() => [ProfileKnowledgeProposalType])
	saveProfileKnowledgeProposals(
		@CurrentUser('sub') uid: string,
		@Args('feedbackId', { type: () => ID }) feedbackId: string,
		@Args('result', { type: () => GraphQLJSON }) result: unknown,
	) {
		return this.profileKnowledgeService.saveProposals(uid, feedbackId, result);
	}

	@Mutation(() => ProfileKnowledgeProposalType)
	resolveProfileKnowledgeProposal(
		@CurrentUser('sub') uid: string,
		@Args('proposalId', { type: () => ID }) proposalId: string,
		@Args('accept') accept: boolean,
	) {
		return this.profileKnowledgeService.resolveProposal(uid, proposalId, accept);
	}
}
