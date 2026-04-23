import type { Application } from '@resume-builder/entities';
import { computed, makeObservable } from 'mobx';

interface HomePageAuthStore {
	user?: {
		given_name?: string;
		name?: string;
	};
}

interface HomePageApplicationStore {
	data: Application[];
}

export class HomePageStore {
	constructor(
		private readonly authStore: HomePageAuthStore,
		private readonly applicationStore: HomePageApplicationStore,
	) {
		makeObservable(this);
	}

	@computed
	get firstName(): string {
		return (
			this.authStore.user?.given_name ??
			this.authStore.user?.name?.trim().split(/\s+/)[0] ??
			'there'
		);
	}

	@computed
	get sortedApplications(): Application[] {
		return [...this.applicationStore.data].sort((left, right) => {
			return (
				new Date(right.updatedAt).getTime() -
				new Date(left.updatedAt).getTime()
			);
		});
	}

	@computed
	get recentApplications(): Application[] {
		return this.sortedApplications.slice(0, 5);
	}

	@computed
	get continueApplication(): Application | null {
		return this.recentApplications[0] ?? null;
	}

	@computed
	get summary() {
		const distinctCompanies = new Set(
			this.applicationStore.data
				.map((application) => application.company?.trim())
				.filter((company): company is string => Boolean(company)),
		);

		return {
			totalApplications: this.applicationStore.data.length,
			applicationsWithResume: this.applicationStore.data.filter(
				(application) => application.resumeId != null,
			).length,
			distinctCompanies: distinctCompanies.size,
		};
	}

	@computed
	get hasApplications(): boolean {
		return this.applicationStore.data.length > 0;
	}

	normalizeCompany(company: string | null | undefined): string {
		const normalized = company?.trim();
		return normalized ? normalized : 'No company';
	}

	formatApplicationUpdatedAt(updatedAt: Date | string): string {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(updatedAt));
	}
}
