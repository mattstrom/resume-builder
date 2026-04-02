import type { Application } from '@resume-builder/entities';
import {
	action,
	computed,
	makeObservable,
	observable,
	reaction,
} from 'mobx';
import type { RootStore } from './root.store.ts';
import { StorageKey } from './services/persistence.service.ts';

type ApplicationSortField = 'NAME' | 'DATE';
type ApplicationGroupBy = 'company' | null;

export class ExplorerSidebarStore {
	@observable
	applicationSortField: ApplicationSortField = 'DATE';

	@observable
	applicationSortAscending = true;

	@observable
	groupSortField: ApplicationSortField = 'DATE';

	@observable
	groupSortAscending = true;

	@observable
	groupBy: ApplicationGroupBy = 'company';

	@observable.shallow
	collapsedGroupKeys = new Set<string>();

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);

		this.watch(
			'applicationSortField',
			StorageKey.ApplicationExplorerApplicationSortField,
			'DATE',
		);
		this.watch(
			'applicationSortAscending',
			StorageKey.ApplicationExplorerApplicationSortAscending,
			true,
		);
		this.watch(
			'groupSortField',
			StorageKey.ApplicationExplorerGroupSortField,
			'DATE',
		);
		this.watch(
			'groupSortAscending',
			StorageKey.ApplicationExplorerGroupSortAscending,
			true,
		);
		this.watch(
			'groupBy',
			StorageKey.ApplicationExplorerGroupBy,
			'company',
		);

		this.collapsedGroupKeys = new Set(
			this.rootStore.persistence.retrieve<string[]>(
				StorageKey.ApplicationExplorerCollapsedGroups,
				[],
			) ?? [],
		);

		reaction(
			() => [...this.collapsedGroupKeys].sort(),
			(groupKeys) => {
				this.rootStore.persistence.store(
					StorageKey.ApplicationExplorerCollapsedGroups,
					groupKeys,
				);
			},
		);
	}

	@computed
	get applications(): Application[] {
		const applications = this.rootStore.applicationStore.data;
		return [...applications].sort((left, right) =>
			this.compareApplications(
				left,
				right,
				this.applicationSortField,
				this.applicationSortAscending,
			),
		);
	}

	@computed
	get groupedApplications(): Map<string, Application[]> | null {
		if (!this.groupBy) {
			return null;
		}

		const groups = new Map<string, Application[]>();
		for (const application of this.applications) {
			const groupName = application.company || 'Unspecified';
			const group = groups.get(groupName);
			if (group) {
				group.push(application);
			} else {
				groups.set(groupName, [application]);
			}
		}

		const sortedEntries = [...groups.entries()].sort(
			([leftGroupName, leftApplications], [rightGroupName, rightApplications]) => {
				if (this.groupSortField === 'NAME') {
					const comparison =
						leftGroupName.localeCompare(rightGroupName);
					return this.groupSortAscending ? comparison : -comparison;
				}

				const leftTimestamp = this.getGroupTimestamp(leftApplications);
				const rightTimestamp =
					this.getGroupTimestamp(rightApplications);
				return this.groupSortAscending
					? leftTimestamp - rightTimestamp
					: rightTimestamp - leftTimestamp;
			},
		);

		return new Map(sortedEntries);
	}

	@computed
	get groupKeys() {
		const groups = this.groupedApplications;
		if (!groups) {
			return [];
		}

		return [...groups.keys()].map((groupName) =>
			this.getGroupStorageKey(groupName),
		);
	}

	@computed
	get allGroupsCollapsed() {
		return (
			this.groupKeys.length > 0 &&
			this.groupKeys.every((groupKey) =>
				this.collapsedGroupKeys.has(groupKey),
			)
		);
	}

	@action
	setApplicationSort(field: ApplicationSortField, ascending = true) {
		this.applicationSortField = field;
		this.applicationSortAscending = ascending;
	}

	@action
	setGroupSort(field: ApplicationSortField, ascending = true) {
		this.groupSortField = field;
		this.groupSortAscending = ascending;
	}

	@action
	setGroupBy(groupBy: ApplicationGroupBy) {
		this.groupBy = groupBy;
	}

	@action
	setGroupOpen(groupName: string, open: boolean) {
		const groupKey = this.getGroupStorageKey(groupName);
		if (open) {
			this.collapsedGroupKeys.delete(groupKey);
		} else {
			this.collapsedGroupKeys.add(groupKey);
		}
	}

	@action
	toggleGroup(groupName: string) {
		const groupKey = this.getGroupStorageKey(groupName);
		if (this.collapsedGroupKeys.has(groupKey)) {
			this.collapsedGroupKeys.delete(groupKey);
		} else {
			this.collapsedGroupKeys.add(groupKey);
		}
	}

	@action
	toggleAllGroups() {
		if (this.allGroupsCollapsed) {
			for (const groupKey of this.groupKeys) {
				this.collapsedGroupKeys.delete(groupKey);
			}
			return;
		}

		for (const groupKey of this.groupKeys) {
			this.collapsedGroupKeys.add(groupKey);
		}
	}

	isGroupOpen(groupName: string) {
		return !this.collapsedGroupKeys.has(this.getGroupStorageKey(groupName));
	}

	private compareApplications(
		left: Application,
		right: Application,
		field: ApplicationSortField,
		ascending: boolean,
	) {
		if (field === 'NAME') {
			const comparison = left.name.localeCompare(right.name);
			return ascending ? comparison : -comparison;
		}

		const leftTimestamp = new Date(left.updatedAt).getTime();
		const rightTimestamp = new Date(right.updatedAt).getTime();
		return ascending
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
			return this.groupSortAscending
				? Math.min(timestamp, applicationTimestamp)
				: Math.max(timestamp, applicationTimestamp);
		}, new Date(applications[0]!.updatedAt).getTime());
	}

	private getGroupStorageKey(groupName: string) {
		return `${this.groupBy ?? 'none'}:${groupName}`;
	}

	private watch<P extends keyof this>(
		property: P,
		storageKey: StorageKey,
		defaultValue: this[P],
	) {
		const { persistence } = this.rootStore;

		this[property] = persistence.retrieve(storageKey, defaultValue)!;

		reaction(
			() => this[property],
			(value) => {
				persistence.store(storageKey, value);
			},
		);
	}
}
