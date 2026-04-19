import type { Application } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';
import { LIST_APPLICATIONS } from '../graphql/queries.ts';
import { API_BASE_URL } from '../utils/api.ts';
import { authFetch } from '../utils/auth.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

export class ApplicationStore {
	private query: ApolloMobxWrapper<{ listApplications: Application[] }>;

	@observable
	selectedApplicationId: string | null = null;

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
		return this.query.data?.listApplications ?? [];
	}

	async refetch() {
		return this.query.refetch();
	}

	async assess(applicationId: string): Promise<void> {
		const response = await authFetch(
			`${API_BASE_URL}/applications/${applicationId}/assess`,
			{ method: 'POST' },
		);
		if (!response.ok) {
			throw new Error(`Assessment failed: ${response.status}`);
		}
	}

	@action
	selectApplication(applicationId: string | null) {
		this.selectedApplicationId = applicationId;
	}
}
