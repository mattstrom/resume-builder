import type { Application, Company } from '@resume-builder/entities';
import { normalizeCompanyName } from '@resume-builder/entities';
import { action, computed, makeObservable, observable, reaction } from 'mobx';

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

	@observable.shallow
	pinnedApplicationIds = new Set<string>();

	@observable
	searchQuery = '';

	@observable
	selectedCompanyName: string | null = null;

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
		this.watch('groupSortField', StorageKey.ApplicationExplorerGroupSortField, 'DATE');
		this.watch('groupSortAscending', StorageKey.ApplicationExplorerGroupSortAscending, true);
		this.watch('groupBy', StorageKey.ApplicationExplorerGroupBy, 'company');

		this.collapsedGroupKeys = new Set(
			this.rootStore.persistence.retrieve<string[]>(
				StorageKey.ApplicationExplorerCollapsedGroups,
				[],
			) ?? [],
		);
		this.pinnedApplicationIds = new Set(
			this.rootStore.persistence.retrieve<string[]>(
				StorageKey.ApplicationExplorerPinnedApplications,
				[],
			) ?? [],
		);
		this.selectedCompanyName = this.rootStore.persistence.retrieve<string | null>(
			StorageKey.ApplicationExplorerSelectedCompany,
			null,
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
		reaction(
			() => [...this.pinnedApplicationIds].sort(),
			(applicationIds) => {
				this.rootStore.persistence.store(
					StorageKey.ApplicationExplorerPinnedApplications,
					applicationIds,
				);
			},
		);
		reaction(
			() => this.selectedCompanyName,
			(companyName) => {
				this.rootStore.persistence.store(
					StorageKey.ApplicationExplorerSelectedCompany,
					companyName,
				);
			},
		);
	}

	@computed
	get applications(): Application[] {
		const applications = this.rootStore.applicationStore.data;
		const sorted = [...applications].sort((left, right) =>
			this.compareApplications(
				left,
				right,
				this.applicationSortField,
				this.applicationSortAscending,
			),
		);
		const q = this.searchQuery.trim().toLowerCase();
		if (!q) return sorted;
		return sorted.filter(
			(a) => a.name.toLowerCase().includes(q) || a.company.toLowerCase().includes(q),
		);
	}

	@computed
	get companies(): Company[] {
		const companies = new Map<string, Company>();

		for (const application of this.applications) {
			const companyName = normalizeCompanyName(application.company);
			const company = companies.get(companyName) ?? {
				id: companyName,
				name: companyName,
				applicationIds: [],
				resumeIds: [],
				applicationCount: 0,
				resumeCount: 0,
				updatedAt: null,
			};

			company.applicationIds.push(application._id);
			company.applicationCount = company.applicationIds.length;
			company.updatedAt = getLatestDate(company.updatedAt, application.updatedAt);

			for (const resume of application.resumes ?? []) {
				if (!company.resumeIds.includes(resume._id)) {
					company.resumeIds.push(resume._id);
				}
			}

			companies.set(companyName, company);
		}

		for (const resume of this.rootStore.resumeStore.data) {
			const application = resume.applicationId
				? this.rootStore.applicationStore.data.find(
						(candidate) => candidate._id === resume.applicationId,
					)
				: null;
			const companyName = normalizeCompanyName(application?.company ?? resume.company);
			const company = companies.get(companyName);
			if (!company) continue;

			if (!company.resumeIds.includes(resume._id)) {
				company.resumeIds.push(resume._id);
			}
			company.updatedAt = getLatestDate(company.updatedAt, resume.updatedAt);
		}

		for (const company of companies.values()) {
			company.resumeCount = company.resumeIds.length;
		}

		return [...companies.values()].sort((left, right) => {
			if (this.groupSortField === 'NAME') {
				const comparison = left.name.localeCompare(right.name);
				return this.groupSortAscending ? comparison : -comparison;
			}

			const leftTimestamp = new Date(left.updatedAt ?? 0).getTime();
			const rightTimestamp = new Date(right.updatedAt ?? 0).getTime();
			return this.groupSortAscending
				? leftTimestamp - rightTimestamp
				: rightTimestamp - leftTimestamp;
		});
	}

	@computed
	get selectedCompany(): Company | null {
		if (this.companies.length === 0) {
			return null;
		}

		return (
			this.companies.find((company) => company.name === this.selectedCompanyName) ??
			this.companies[0]!
		);
	}

	@computed
	get selectedCompanyApplications(): Application[] {
		const selectedCompany = this.selectedCompany;
		if (!selectedCompany) {
			return [];
		}

		return this.applications.filter(
			(application) => normalizeCompanyName(application.company) === selectedCompany.name,
		);
	}

	@computed
	get recentApplications(): Application[] {
		if (this.searchQuery.trim()) {
			return [];
		}

		return [...this.rootStore.applicationStore.data]
			.sort((left, right) => {
				return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
			})
			.filter((application) => !this.pinnedApplicationIds.has(application._id))
			.slice(0, 5);
	}

	@computed
	get pinnedApplications(): Application[] {
		if (this.searchQuery.trim()) {
			return [];
		}

		return [...this.rootStore.applicationStore.data]
			.filter((application) => this.pinnedApplicationIds.has(application._id))
			.sort((left, right) => {
				return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
			});
	}

	@computed
	get groupedApplications(): Map<string, Application[]> | null {
		if (this.searchQuery.trim() || !this.groupBy) {
			return null;
		}

		return this.groupApplicationsByCompany(this.applications);
	}

	@computed
	get companyGroups(): Map<string, Application[]> {
		return this.groupApplicationsByCompany(this.applications);
	}

	private groupApplicationsByCompany(applications: Application[]) {
		const groups = new Map<string, Application[]>();
		for (const application of applications) {
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
					const comparison = leftGroupName.localeCompare(rightGroupName);
					return this.groupSortAscending ? comparison : -comparison;
				}

				const leftTimestamp = this.getGroupTimestamp(leftApplications);
				const rightTimestamp = this.getGroupTimestamp(rightApplications);
				return this.groupSortAscending
					? leftTimestamp - rightTimestamp
					: rightTimestamp - leftTimestamp;
			},
		);

		return new Map(sortedEntries);
	}

	@computed
	get groupKeys() {
		return [...this.companyGroups.keys()].map((groupName) =>
			this.getGroupStorageKey(groupName),
		);
	}

	@computed
	get allGroupsCollapsed() {
		return (
			this.groupKeys.length > 0 &&
			this.groupKeys.every((groupKey) => this.collapsedGroupKeys.has(groupKey))
		);
	}

	@action
	setSearchQuery(q: string) {
		this.searchQuery = q;
	}

	@action
	setSelectedCompany(companyName: string) {
		this.selectedCompanyName = companyName;
	}

	@action
	togglePinnedApplication(applicationId: string) {
		if (this.pinnedApplicationIds.has(applicationId)) {
			this.pinnedApplicationIds.delete(applicationId);
			return;
		}

		this.pinnedApplicationIds.add(applicationId);
	}

	isApplicationPinned(applicationId: string) {
		return this.pinnedApplicationIds.has(applicationId);
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
		return ascending ? leftTimestamp - rightTimestamp : rightTimestamp - leftTimestamp;
	}

	private getGroupTimestamp(applications: Application[]) {
		if (applications.length === 0) {
			return 0;
		}

		return applications.reduce((timestamp, application) => {
			const applicationTimestamp = new Date(application.updatedAt).getTime();
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

function getLatestDate(
	left: Date | string | null | undefined,
	right: Date | string | null | undefined,
) {
	if (!left) {
		return right ?? null;
	}

	if (!right) {
		return left;
	}

	return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}
