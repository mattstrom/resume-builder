import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../auth/index.js';
import {
	CreateExpressionInput,
	CreateFactInput,
	ConceptSuggestionType,
	ExpressionType,
	FactConceptType,
	FactType,
	LinkFactInput,
	ResumeFactType,
	UpdateFactInput,
	UpsertFactConceptInput,
} from './facts.graphql.js';
import { FactsService } from './facts.service.js';

@Resolver(() => FactType)
export class FactsResolver {
	constructor(private readonly factsService: FactsService) {}

	@Query(() => [FactType])
	async facts(
		@CurrentUser('sub') uid: string,
		@Args('kind', { nullable: true }) kind?: string,
		@Args('entityType', { nullable: true }) entityType?: string,
		@Args('entityId', { nullable: true }) entityId?: string,
	) {
		return this.factsService.findAll(uid, { kind, entityType, entityId });
	}

	@Query(() => FactType)
	async fact(@CurrentUser('sub') uid: string, @Args('id', { type: () => ID }) id: string) {
		return this.factsService.findById(uid, id);
	}

	@Mutation(() => FactType)
	async createFact(@CurrentUser('sub') uid: string, @Args('input') input: CreateFactInput) {
		return this.factsService.create(uid, input);
	}

	@Mutation(() => FactType)
	async updateFact(
		@CurrentUser('sub') uid: string,
		@Args('id', { type: () => ID }) id: string,
		@Args('input') input: UpdateFactInput,
	) {
		return this.factsService.update(uid, id, input);
	}

	@Mutation(() => Boolean)
	async deleteFact(
		@CurrentUser('sub') uid: string,
		@Args('id', { type: () => ID }) id: string,
	): Promise<boolean> {
		await this.factsService.delete(uid, id);

		return true;
	}

	@Query(() => [FactConceptType])
	async factConcepts(
		@CurrentUser('sub') uid: string,
		@Args('factId', { type: () => ID }) factId: string,
	) {
		return this.factsService.findFactConcepts(uid, factId);
	}

	@Query(() => [ConceptSuggestionType])
	async conceptSuggestions(
		@CurrentUser('sub') uid: string,
		@Args('vocabulary') vocabulary: string,
		@Args('search', { nullable: true }) search?: string,
		@Args('limit', { type: () => Int, nullable: true }) limit?: number,
	) {
		return this.factsService.findConceptSuggestions(uid, vocabulary, search, limit);
	}

	@Mutation(() => FactConceptType)
	async upsertFactConcept(
		@CurrentUser('sub') uid: string,
		@Args('factId', { type: () => ID }) factId: string,
		@Args('input') input: UpsertFactConceptInput,
	) {
		return this.factsService.upsertFactConcept(uid, factId, input);
	}

	@Mutation(() => Boolean)
	async deleteFactConcept(
		@CurrentUser('sub') uid: string,
		@Args('factId', { type: () => ID }) factId: string,
		@Args('conceptId', { type: () => ID }) conceptId: string,
		@Args('relation') relation: string,
	): Promise<boolean> {
		await this.factsService.deleteFactConcept(uid, factId, conceptId, relation);

		return true;
	}

	@Query(() => [ExpressionType])
	async expressions(
		@CurrentUser('sub') uid: string,
		@Args('factId', { type: () => ID }) factId: string,
	) {
		return this.factsService.findExpressions(uid, factId);
	}

	@Mutation(() => ExpressionType)
	async createExpression(
		@CurrentUser('sub') uid: string,
		@Args('factId', { type: () => ID }) factId: string,
		@Args('input') input: CreateExpressionInput,
	) {
		return this.factsService.createExpression(uid, factId, input);
	}

	@Mutation(() => Boolean)
	async deleteExpression(
		@CurrentUser('sub') uid: string,
		@Args('factId', { type: () => ID }) factId: string,
		@Args('expressionId', { type: () => ID }) expressionId: string,
	): Promise<boolean> {
		await this.factsService.deleteExpression(uid, factId, expressionId);

		return true;
	}

	@Query(() => [ResumeFactType])
	async resumeFacts(@Args('resumeId', { type: () => ID }) resumeId: string) {
		return this.factsService.findResumeFacts(resumeId);
	}

	@Mutation(() => ResumeFactType)
	async linkFactToResume(
		@CurrentUser('sub') uid: string,
		@Args('resumeId', { type: () => ID }) resumeId: string,
		@Args('input') input: LinkFactInput,
	) {
		const { factId, ...dto } = input;

		return this.factsService.linkFact(uid, resumeId, factId, dto);
	}

	@Mutation(() => Boolean)
	async unlinkFactFromResume(
		@Args('resumeId', { type: () => ID }) resumeId: string,
		@Args('factId', { type: () => ID }) factId: string,
	): Promise<boolean> {
		await this.factsService.unlinkFact(resumeId, factId);

		return true;
	}
}
