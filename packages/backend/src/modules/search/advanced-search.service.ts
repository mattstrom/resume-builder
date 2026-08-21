import { Injectable } from '@nestjs/common';
import { BulletSourceType } from '@resume-builder/entities';

import { ConceptsService } from '../concepts/concepts.service.js';
import { BulletsService } from '../entities/bullets/bullets.service.js';
import { ResumesService } from '../entities/resumes/resumes.service.js';
import { EmbeddingService } from '../queue/embeddings/embedding.service.js';
import { AdvancedSearchPayload, AdvancedSearchResultType } from './advanced-search.graphql.js';

const BULLET_RESULT_TYPES = new Set([
	AdvancedSearchResultType.BULLET,
	AdvancedSearchResultType.PROJECT,
	AdvancedSearchResultType.WORK_HISTORY,
	AdvancedSearchResultType.VOLUNTEERING,
]);

const CONCEPT_RESULT_TYPES = new Set([
	AdvancedSearchResultType.CONCEPT,
	AdvancedSearchResultType.SKILL,
	AdvancedSearchResultType.PROJECT,
	AdvancedSearchResultType.FACT,
]);

@Injectable()
export class AdvancedSearchService {
	constructor(
		private readonly resumes: ResumesService,
		private readonly bullets: BulletsService,
		private readonly concepts: ConceptsService,
		private readonly embedding: EmbeddingService,
	) {}

	async search(
		uid: string,
		query: string,
		resultTypes: AdvancedSearchResultType[],
		limit = 50,
		minimumScore = 0.45,
	): Promise<AdvancedSearchPayload> {
		const requested = new Set(resultTypes);
		const needsBullets = resultTypes.some((type) => BULLET_RESULT_TYPES.has(type));
		const needsConcepts = resultTypes.some((type) => CONCEPT_RESULT_TYPES.has(type));

		const [resumes, rawBullets, concepts] = await Promise.all([
			requested.has(AdvancedSearchResultType.SUMMARY)
				? this.resumes.search(uid, query, limit, true)
				: Promise.resolve([]),
			needsBullets
				? this.bullets.search(uid, query, {}, limit, minimumScore)
				: Promise.resolve([]),
			needsConcepts
				? this.searchConcepts(uid, query, limit, minimumScore)
				: Promise.resolve([]),
		]);

		const bullets = requested.has(AdvancedSearchResultType.BULLET)
			? rawBullets
			: rawBullets.filter(({ bullet }) => {
					if (
						bullet.sourceType === BulletSourceType.JOB &&
						requested.has(AdvancedSearchResultType.WORK_HISTORY)
					) {
						return true;
					}
					if (
						bullet.sourceType === BulletSourceType.PROJECT &&
						requested.has(AdvancedSearchResultType.PROJECT)
					) {
						return true;
					}
					return (
						bullet.sourceType === BulletSourceType.VOLUNTEERING &&
						requested.has(AdvancedSearchResultType.VOLUNTEERING)
					);
				});

		return { resumes, bullets, concepts };
	}

	private async searchConcepts(uid: string, query: string, limit: number, minimumScore: number) {
		const text = query.trim();
		if (!text) return [];
		const vector = await this.embedding.embed(text);
		return this.concepts.findSimilarConcepts(uid, vector, undefined, limit, minimumScore);
	}
}
