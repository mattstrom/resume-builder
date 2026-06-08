import type { Volunteering } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';

import {
	CREATE_VOLUNTEERING,
	DELETE_VOLUNTEERING,
	UPDATE_VOLUNTEERING,
} from '../graphql/mutations.ts';
import { LIST_VOLUNTEERING } from '../graphql/queries.ts';
import { getMastraClient } from '../lib/mastra-client.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

type VolunteeringInput = Omit<Volunteering, '_id' | 'uid'>;

export class VolunteeringStore {
	private query: ApolloMobxWrapper<{ listVolunteering: Volunteering[] }>;

	@observable isAutoFilling = false;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
		this.query = ApolloMobxWrapper.create<{ listVolunteering: Volunteering[] }>(
			rootStore.client,
			{
				query: LIST_VOLUNTEERING,
			},
		);
	}

	@computed
	get volunteering(): Volunteering[] {
		return this.query.data?.listVolunteering ?? [];
	}

	get loading(): boolean {
		return this.query.loading;
	}

	async create(input: VolunteeringInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: CREATE_VOLUNTEERING,
			variables: { volunteering: input },
		});
		await this.query.refetch();
	}

	async update(id: string, input: VolunteeringInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: UPDATE_VOLUNTEERING,
			variables: { id, volunteering: input },
		});
		await this.query.refetch();
	}

	async delete(id: string): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: DELETE_VOLUNTEERING,
			variables: { id },
		});
		await this.query.refetch();
	}

	@action
	async autofill(): Promise<void> {
		this.isAutoFilling = true;
		try {
			const client = await getMastraClient();
			const workflow = client.getWorkflow('backgroundAutofillWorkflow');
			const run = await workflow.createRun();
			await run.startAsync({ inputData: { entityType: 'volunteering' } });
			await this.query.refetch();
		} finally {
			this.isAutoFilling = false;
		}
	}
}
