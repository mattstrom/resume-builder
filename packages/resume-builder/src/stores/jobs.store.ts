import type { Job } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';

import { CREATE_JOB, DELETE_JOB, UPDATE_JOB } from '../graphql/mutations.ts';
import { LIST_JOBS } from '../graphql/queries.ts';
import { getMastraClient } from '../lib/mastra-client.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

type JobInput = Omit<Job, '_id' | 'uid'>;

export class JobsStore {
	private query: ApolloMobxWrapper<{ listJobs: Job[] }>;

	@observable isAutoFilling = false;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
		this.query = ApolloMobxWrapper.create<{ listJobs: Job[] }>(rootStore.client, {
			query: LIST_JOBS,
		});
	}

	@computed
	get jobs(): Job[] {
		return this.query.data?.listJobs ?? [];
	}

	get loading(): boolean {
		return this.query.loading;
	}

	async create(input: JobInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: CREATE_JOB,
			variables: { job: input },
		});
		await this.query.refetch();
	}

	async update(id: string, input: JobInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: UPDATE_JOB,
			variables: { id, job: input },
		});
		await this.query.refetch();
	}

	async delete(id: string): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: DELETE_JOB,
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
			await run.startAsync({ inputData: { entityType: 'jobs' } });
			await this.query.refetch();
		} finally {
			this.isAutoFilling = false;
		}
	}
}
