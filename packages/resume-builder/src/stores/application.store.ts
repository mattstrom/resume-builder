import type { Application } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';
import { LIST_APPLICATIONS } from '../graphql/queries.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

const STORAGE_KEY_SORT_FIELD = 'applicationList.sortField';
const STORAGE_KEY_SORT_ASCENDING = 'applicationList.sortAscending';
const STORAGE_KEY_GROUP_BY = 'applicationList.groupBy';

export class ApplicationStore {
	private query: ApolloMobxWrapper<{ listApplications: Application[] }>;

	@observable
	selectedApplicationId: string | null = null;

	@observable
	sortField: 'NAME' | 'DATE' =
		(localStorage.getItem(STORAGE_KEY_SORT_FIELD) as 'NAME' | 'DATE') ??
		'DATE';

	@observable
	sortAscending: boolean =
		localStorage.getItem(STORAGE_KEY_SORT_ASCENDING) !== 'false';

	@observable
	groupBy: 'company' | null =
		(localStorage.getItem(STORAGE_KEY_GROUP_BY) as 'company' | null) ??
		'company';

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);

		this.query = ApolloMobxWrapper.create<{
			listApplications: Application[];
		}>(rootStore.client, {
			query: LIST_APPLICATIONS,
		});
	}

	@computed
	get selectedApplication() {
		return (
			this.data.find(
				(application) => application._id === this.selectedApplicationId,
			) ?? null
		);
	}

	@computed
	get data(): Application[] {
		const applications = this.query.data?.listApplications ?? [];
		return [...applications].sort((left, right) =>
			this.compareApplications(left, right),
		);
	}

	@computed
	get groupedData(): Map<string, Application[]> | null {
		if (!this.groupBy) {
			return null;
		}

		const groups = new Map<string, Application[]>();
		for (const application of this.data) {
			const key = application.company || 'Unspecified';
			const group = groups.get(key);
			if (group) {
				group.push(application);
			} else {
				groups.set(key, [application]);
			}
		}

		const sortedEntries = [...groups.entries()].sort(
			([leftGroupName, leftApplications], [rightGroupName, rightApplications]) => {
				if (this.sortField === 'NAME') {
					const nameComparison =
						leftGroupName.localeCompare(rightGroupName);
					return this.sortAscending ? nameComparison : -nameComparison;
				}

				const leftTimestamp = this.getGroupTimestamp(leftApplications);
				const rightTimestamp =
					this.getGroupTimestamp(rightApplications);
				return this.sortAscending
					? leftTimestamp - rightTimestamp
					: rightTimestamp - leftTimestamp;
			},
		);

		return new Map(sortedEntries);
	}

	async refetch() {
		return this.query.refetch();
	}

	@action
	selectApplication(applicationId: string | null) {
		this.selectedApplicationId = applicationId;
	}

	@action
	setSort(field: 'NAME' | 'DATE', ascending = true) {
		this.sortField = field;
		this.sortAscending = ascending;
		localStorage.setItem(STORAGE_KEY_SORT_FIELD, field);
		localStorage.setItem(STORAGE_KEY_SORT_ASCENDING, String(ascending));
	}

	@action
	setGroupBy(groupBy: 'company' | null) {
		this.groupBy = groupBy;

		if (groupBy) {
			localStorage.setItem(STORAGE_KEY_GROUP_BY, groupBy);
		} else {
			localStorage.removeItem(STORAGE_KEY_GROUP_BY);
		}
	}

	private compareApplications(left: Application, right: Application) {
		if (this.sortField === 'NAME') {
			const nameComparison = left.name.localeCompare(right.name);
			return this.sortAscending ? nameComparison : -nameComparison;
		}

		const leftTimestamp = new Date(left.updatedAt).getTime();
		const rightTimestamp = new Date(right.updatedAt).getTime();
		return this.sortAscending
			? leftTimestamp - rightTimestamp
			: rightTimestamp - leftTimestamp;
	}

	private getGroupTimestamp(applications: Application[]) {
		if (applications.length === 0) {
			return 0;
		}

		return applications.reduce((timestamp, application) => {
			const applicationTimestamp = new Date(
				application.updatedAt,
			).getTime();
			return this.sortAscending
				? Math.min(timestamp, applicationTimestamp)
				: Math.max(timestamp, applicationTimestamp);
		}, new Date(applications[0]!.updatedAt).getTime());
	}
}
