import { Args, Float, Int, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../auth/index.js';
import { AdvancedSearchPayload, AdvancedSearchResultType } from './advanced-search.graphql.js';
import { AdvancedSearchService } from './advanced-search.service.js';

@Resolver()
export class AdvancedSearchResolver {
	constructor(private readonly advancedSearchService: AdvancedSearchService) {}

	@Query(() => AdvancedSearchPayload)
	async advancedSearch(
		@CurrentUser('sub') uid: string,
		@Args('query') query: string,
		@Args('resultTypes', { type: () => [AdvancedSearchResultType] })
		resultTypes: AdvancedSearchResultType[],
		@Args('limit', { type: () => Int, nullable: true, defaultValue: 50 })
		limit: number,
		@Args('minimumScore', { type: () => Float, nullable: true, defaultValue: 0.45 })
		minimumScore: number,
	): Promise<AdvancedSearchPayload> {
		return this.advancedSearchService.search(uid, query, resultTypes, limit, minimumScore);
	}
}
