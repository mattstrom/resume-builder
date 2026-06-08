import type { Skill } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';

import { CREATE_SKILL, DELETE_SKILL, UPDATE_SKILL } from '../graphql/mutations.ts';
import { LIST_SKILLS } from '../graphql/queries.ts';
import { getMastraClient } from '../lib/mastra-client.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

type SkillInput = Omit<Skill, '_id' | 'uid'>;

export class SkillsStore {
	private query: ApolloMobxWrapper<{ listSkills: Skill[] }>;

	@observable isAutoFilling = false;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
		this.query = ApolloMobxWrapper.create<{ listSkills: Skill[] }>(rootStore.client, {
			query: LIST_SKILLS,
		});
	}

	@computed
	get skills(): Skill[] {
		return this.query.data?.listSkills ?? [];
	}

	get loading(): boolean {
		return this.query.loading;
	}

	async create(input: SkillInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: CREATE_SKILL,
			variables: { skill: input },
		});
		await this.query.refetch();
	}

	async update(id: string, input: SkillInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: UPDATE_SKILL,
			variables: { id, skill: input },
		});
		await this.query.refetch();
	}

	async delete(id: string): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: DELETE_SKILL,
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
			await run.startAsync({ inputData: { entityType: 'skills' } });
			await this.query.refetch();
		} finally {
			this.isAutoFilling = false;
		}
	}
}
