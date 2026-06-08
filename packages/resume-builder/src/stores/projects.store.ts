import type { Project } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';

import { CREATE_PROJECT, DELETE_PROJECT, UPDATE_PROJECT } from '../graphql/mutations.ts';
import { LIST_PROJECTS } from '../graphql/queries.ts';
import { getMastraClient } from '../lib/mastra-client.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

type ProjectInput = Omit<Project, '_id' | 'uid'>;

export class ProjectsStore {
	private query: ApolloMobxWrapper<{ listProjects: Project[] }>;

	@observable isAutoFilling = false;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
		this.query = ApolloMobxWrapper.create<{ listProjects: Project[] }>(rootStore.client, {
			query: LIST_PROJECTS,
		});
	}

	@computed
	get projects(): Project[] {
		return this.query.data?.listProjects ?? [];
	}

	get loading(): boolean {
		return this.query.loading;
	}

	async create(input: ProjectInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: CREATE_PROJECT,
			variables: { project: input },
		});
		await this.query.refetch();
	}

	async update(id: string, input: ProjectInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: UPDATE_PROJECT,
			variables: { id, project: input },
		});
		await this.query.refetch();
	}

	async delete(id: string): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: DELETE_PROJECT,
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
			await run.startAsync({ inputData: { entityType: 'projects' } });
			await this.query.refetch();
		} finally {
			this.isAutoFilling = false;
		}
	}
}
