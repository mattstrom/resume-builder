import { Args, Float, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	Bullet,
	BulletConcept,
	BulletFilterInput,
	BulletMeaningInput,
	BulletStatus,
	CreateBulletInput,
	UpdateBulletInput,
} from '@resume-builder/entities';

import { CurrentUser } from '../../auth/index.js';
import { BulletSearchResult } from './bullet-search.graphql.js';
import { BulletsService } from './bullets.service.js';

@Resolver(() => Bullet)
export class BulletsResolver {
	constructor(private readonly bulletsService: BulletsService) {}

	@Query(() => [Bullet])
	async bullets(
		@CurrentUser('sub') uid: string,
		@Args('filter', { nullable: true }) filter?: BulletFilterInput,
	): Promise<Bullet[]> {
		return this.bulletsService.findAll(uid, filter);
	}

	@Query(() => Bullet)
	async bullet(
		@CurrentUser('sub') uid: string,
		@Args('id', { type: () => ID }) id: string,
	): Promise<Bullet> {
		return this.bulletsService.find(uid, id);
	}

	@Query(() => [BulletSearchResult])
	async searchBullets(
		@CurrentUser('sub') uid: string,
		@Args('query') query: string,
		@Args('filter', { nullable: true }) filter?: BulletFilterInput,
		@Args('limit', { type: () => Int, nullable: true }) limit?: number,
		@Args('minimumScore', { type: () => Float, nullable: true }) minimumScore?: number,
	): Promise<BulletSearchResult[]> {
		return this.bulletsService.search(uid, query, filter, limit, minimumScore);
	}

	@Mutation(() => Bullet)
	async createBullet(
		@CurrentUser('sub') uid: string,
		@Args('input') input: CreateBulletInput,
	): Promise<Bullet> {
		return this.bulletsService.create(uid, input);
	}

	@Mutation(() => Bullet)
	async updateBullet(
		@CurrentUser('sub') uid: string,
		@Args('id', { type: () => ID }) id: string,
		@Args('input') input: UpdateBulletInput,
	): Promise<Bullet> {
		return this.bulletsService.update(uid, id, input);
	}

	@Mutation(() => Bullet)
	async setBulletStatus(
		@CurrentUser('sub') uid: string,
		@Args('id', { type: () => ID }) id: string,
		@Args('status', { type: () => BulletStatus }) status: BulletStatus,
	): Promise<Bullet> {
		return this.bulletsService.setStatus(uid, id, status);
	}

	@Mutation(() => [Bullet])
	async reorderBullets(
		@CurrentUser('sub') uid: string,
		@Args('id', { type: () => ID }) id: string,
		@Args('targetId', { type: () => ID }) targetId: string,
	): Promise<Bullet[]> {
		return this.bulletsService.reorder(uid, id, targetId);
	}

	@Mutation(() => BulletConcept)
	async upsertBulletConcept(
		@CurrentUser('sub') uid: string,
		@Args('bulletId', { type: () => ID }) bulletId: string,
		@Args('meaning') meaning: BulletMeaningInput,
	) {
		return this.bulletsService.upsertConcept(uid, bulletId, meaning);
	}

	@Mutation(() => Boolean)
	async deleteBulletConcept(
		@CurrentUser('sub') uid: string,
		@Args('bulletId', { type: () => ID }) bulletId: string,
		@Args('conceptId', { type: () => ID }) conceptId: string,
		@Args('relation') relation: string,
	): Promise<boolean> {
		await this.bulletsService.deleteConcept(uid, bulletId, conceptId, relation);
		return true;
	}

	@Mutation(() => [BulletConcept])
	async replaceGeneratedBulletConcepts(
		@CurrentUser('sub') uid: string,
		@Args('bulletId', { type: () => ID }) bulletId: string,
		@Args('expectedText') expectedText: string,
		@Args('meanings', { type: () => [BulletMeaningInput] }) meanings: BulletMeaningInput[],
	) {
		return this.bulletsService.replaceGeneratedConcepts(uid, bulletId, expectedText, meanings);
	}
}
