import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	Bullet,
	BulletFilterInput,
	BulletStatus,
	CreateBulletInput,
	UpdateBulletInput,
} from '@resume-builder/entities';

import { CurrentUser } from '../../auth/index.js';
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
}
