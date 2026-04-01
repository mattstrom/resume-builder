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

const STORAGE_KEY_SORT_FIELD = 'resumeList.sortField';
const STORAGE_KEY_SORT_ASCENDING = 'resumeList.sortAscending';
const STORAGE_KEY_GROUP_BY = 'resumeList.groupBy';

export class ResumeStore {
	private query: ApolloMobxWrapper<
		{ listResumes: Resume[] },
		ListResumesVariables
	>;

	@observable
	selectedResumeId: string | null = null;

	@observable
	sortField: string | null =
		localStorage.getItem(STORAGE_KEY_SORT_FIELD) ?? null;

	@observable
	sortAscending: boolean =
		localStorage.getItem(STORAGE_KEY_SORT_ASCENDING) !== 'false';

	@observable
	groupBy: 'company' | 'level' | null =
		(localStorage.getItem(STORAGE_KEY_GROUP_BY) as
			| 'company'
			| 'level'
			| null) ?? null;

	@computed
	get selectedResume() {
		return (
			this.data.find((resume) => resume._id === this.selectedResumeId) ??
			null
		);
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

		if (field) {
			localStorage.setItem(STORAGE_KEY_SORT_FIELD, field);
		} else {
			localStorage.removeItem(STORAGE_KEY_SORT_FIELD);
		}
		localStorage.setItem(STORAGE_KEY_SORT_ASCENDING, String(ascending));

		const sort = field ? { field, ascending } : undefined;
		this.query.refetch({ sort });
	}

	@action
	setGroupBy(groupBy: 'company' | 'level' | null) {
		this.groupBy = groupBy;

		if (groupBy) {
			localStorage.setItem(STORAGE_KEY_GROUP_BY, groupBy);
		} else {
			localStorage.removeItem(STORAGE_KEY_GROUP_BY);
		}
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

		const sort = this.sortField
			? { field: this.sortField, ascending: this.sortAscending }
			: undefined;

		this.query = ApolloMobxWrapper.create<
			{ listResumes: Resume[] },
			ListResumesVariables
		>(rootStore.client, {
			query: LIST_RESUMES,
			variables: sort ? { sort } : {},
		});
	}

	@action
	selectResume(resumeId: string) {
		this.selectedResumeId = resumeId;
	}
}
