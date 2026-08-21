import { Args, Float, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { agentSearchResultTypeSchema } from '@resume-builder/entities';

import { CurrentUser } from '../auth/index.js';
import {
	AdvancedSearchPayload,
	AdvancedSearchResultType,
} from './advanced-search.graphql.js';
import { AdvancedSearchService } from './advanced-search.service.js';
import { SearchResultFeedbackType } from './search-feedback.graphql.js';
import { SearchFeedbackService } from './search-feedback.service.js';

@Resolver()
export class AdvancedSearchResolver {
	constructor(
		private readonly advancedSearchService: AdvancedSearchService,
		private readonly searchFeedback: SearchFeedbackService,
	) {}

	@Query(() => AdvancedSearchPayload)
	async advancedSearch(
		@CurrentUser('sub') uid: string,
		@Args('query') query: string,
		@Args('resultTypes', { type: () => [AdvancedSearchResultType] })
		resultTypes: AdvancedSearchResultType[],
		@Args('limit', { type: () => Int, nullable: true, defaultValue: 50 })
		limit: number,
		@Args('minimumScore', {
			type: () => Float,
			nullable: true,
			defaultValue: 0.45,
		})
		minimumScore: number,
	): Promise<AdvancedSearchPayload> {
		return this.advancedSearchService.search(
			uid,
			query,
			resultTypes,
			limit,
			minimumScore,
		);
	}

	@Mutation(() => SearchResultFeedbackType)
	async saveSearchResultFeedback(
		@CurrentUser('sub') uid: string,
		@Args('searchRunId') searchRunId: string,
		@Args('query') query: string,
		@Args('resultId') resultId: string,
		@Args('resultType') resultType: string,
		@Args('rank', { type: () => Int }) rank: number,
		@Args('agentScore', { type: () => Float }) agentScore: number,
		@Args('relevant') relevant: boolean,
	): Promise<SearchResultFeedbackType> {
		return this.searchFeedback.upsert(uid, {
			searchRunId,
			query,
			resultId,
			resultType: agentSearchResultTypeSchema.parse(resultType),
			rank,
			agentScore,
			relevant,
		});
	}
}
