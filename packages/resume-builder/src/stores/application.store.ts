import type { Application } from '@resume-builder/entities';
import { action, computed, makeObservable, observable } from 'mobx';
import { LIST_APPLICATIONS } from '../graphql/queries.ts';
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

	@action
	selectApplication(applicationId: string | null) {
		this.selectedApplicationId = applicationId;
	}
}
