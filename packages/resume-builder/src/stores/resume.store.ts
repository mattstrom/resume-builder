import type { Resume } from '@resume-builder/entities';
import { computed, observable } from 'mobx';
import { LIST_RESUMES } from '../graphql/queries.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

export class ResumeStore {
	private query: ApolloMobxWrapper<{ listResumes: Resume[] }, {}>;

	@observable
	selectedResumeId: string | null = null;

	@computed
	get selectedResume() {
		return this.data.find((resume) => resume._id === this.selectedResumeId);
	}

	get data() {
		if (!this.query.data) {
			return [];
		}

		return this.query.data.listResumes;
	}

	constructor(readonly rootStore: RootStore) {
		this.query = ApolloMobxWrapper.create<{ listResumes: Resume[] }, {}>(
			rootStore.client,
			{
				query: LIST_RESUMES,
				variables: {},
			},
		);
	}
}
