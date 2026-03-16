import type { Resume } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';
import { LIST_RESUMES } from '../graphql/queries.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

interface ListResumesVariables {
	sort?: {
		field: string;
		ascending: boolean;
	};
}

export class ResumeStore {
	private query: ApolloMobxWrapper<
		{ listResumes: Resume[] },
		ListResumesVariables
	>;

	@observable
	selectedResumeId: string | null = null;

	@observable
	sortField: string | null = null;

	@observable
	sortAscending: boolean = true;

	@observable
	groupBy: 'company' | 'level' | null = null;

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

	async refetch() {
		return this.query.refetch();
	}

	@action
	setSort(field: string | null, ascending = true) {
		this.sortField = field;
		this.sortAscending = ascending;

		const sort = field ? { field, ascending } : undefined;
		this.query.refetch({ sort });
	}

	@action
	setGroupBy(groupBy: 'company' | 'level' | null) {
		this.groupBy = groupBy;
	}

	@computed
	get groupedData(): Map<string, Resume[]> | null {
		if (!this.groupBy) return null;

		const groups = new Map<string, Resume[]>();
		for (const resume of this.data) {
			const key = resume[this.groupBy] || 'Unspecified';
			const group = groups.get(key);
			if (group) {
				group.push(resume);
			} else {
				groups.set(key, [resume]);
			}
		}
		return groups;
	}

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);

		this.query = ApolloMobxWrapper.create<
			{ listResumes: Resume[] },
			ListResumesVariables
		>(rootStore.client, {
			query: LIST_RESUMES,
			variables: {},
		});
	}
}
