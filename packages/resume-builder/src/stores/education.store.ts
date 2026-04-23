import type { Education } from '@resume-builder/entities';
import { computed, makeObservable } from 'mobx';
import { LIST_EDUCATIONS } from '../graphql/queries.ts';
import {
	CREATE_EDUCATION,
	DELETE_EDUCATION,
	UPDATE_EDUCATION,
} from '../graphql/mutations.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

type EducationInput = Omit<Education, '_id' | 'uid'>;

export class EducationStore {
	private query: ApolloMobxWrapper<{ listEducations: Education[] }>;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);

		this.query = ApolloMobxWrapper.create<{ listEducations: Education[] }>(
			rootStore.client,
			{ query: LIST_EDUCATIONS },
		);
	}

	@computed
	get educations(): Education[] {
		return this.query.data?.listEducations ?? [];
	}

	get loading(): boolean {
		return this.query.loading;
	}

	async create(input: EducationInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: CREATE_EDUCATION,
			variables: { education: input },
		});
		await this.query.refetch();
	}

	async update(id: string, input: EducationInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: UPDATE_EDUCATION,
			variables: { id, education: input },
		});
		await this.query.refetch();
	}

	async delete(id: string): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: DELETE_EDUCATION,
			variables: { id },
		});
		await this.query.refetch();
	}
}
