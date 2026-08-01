import {
	type Bullet,
	BulletSourceType,
	BulletStatus,
	type CreateBulletInput,
	type UpdateBulletInput,
} from '@resume-builder/entities';
import { computed, makeObservable } from 'mobx';

import {
	CREATE_BULLET,
	REORDER_BULLETS,
	SET_BULLET_STATUS,
	UPDATE_BULLET,
} from '../graphql/mutations.ts';
import { LIST_BULLETS } from '../graphql/queries.ts';
import {
	bulletFromGraphql,
	bulletStatusGraphqlValue,
	createBulletGraphqlInput,
	type GraphqlBullet,
} from '../lib/bullet-graphql.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

export class BulletsStore {
	private readonly query: ApolloMobxWrapper<{ bullets: GraphqlBullet[] }>;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
		this.query = ApolloMobxWrapper.create<{ bullets: GraphqlBullet[] }>(rootStore.client, {
			query: LIST_BULLETS,
			variables: { filter: { includeArchived: true } },
		});
	}

	@computed
	get bullets(): Bullet[] {
		return this.query.data?.bullets.map(bulletFromGraphql) ?? [];
	}

	get loading(): boolean {
		return this.query.loading;
	}

	forSource(sourceType: BulletSourceType, sourceId: string, includeArchived = false) {
		return this.bullets.filter(
			(bullet) =>
				bullet.sourceType === sourceType &&
				bullet.sourceId === sourceId &&
				(includeArchived || bullet.status !== BulletStatus.ARCHIVED),
		);
	}

	async create(input: CreateBulletInput): Promise<string | undefined> {
		const result = await this.rootStore.client.mutate<{
			createBullet: { id: string };
		}>({
			mutation: CREATE_BULLET,
			variables: { input: createBulletGraphqlInput(input) },
		});
		await this.query.refetch();
		return result.data?.createBullet.id;
	}

	async update(id: string, input: UpdateBulletInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: UPDATE_BULLET,
			variables: { id, input },
		});
		await this.query.refetch();
	}

	async setStatus(id: string, status: BulletStatus): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: SET_BULLET_STATUS,
			variables: { id, status: bulletStatusGraphqlValue(status) },
		});
		await this.query.refetch();
	}

	async reorder(id: string, targetId: string): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: REORDER_BULLETS,
			variables: { id, targetId },
		});
		await this.query.refetch();
	}
}
