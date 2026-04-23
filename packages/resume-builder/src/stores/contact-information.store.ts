import type { ContactInformation } from '@resume-builder/entities';
import { computed, makeObservable } from 'mobx';
import { GET_CONTACT_INFORMATION } from '../graphql/queries.ts';
import { UPSERT_CONTACT_INFORMATION } from '../graphql/mutations.ts';
import { ApolloMobxWrapper } from './data-sources/apollo-mobx-wrapper.ts';
import type { RootStore } from './root.store.ts';

type ContactInformationInput = Omit<ContactInformation, '_id' | 'uid'>;

export class ContactInformationStore {
	private query: ApolloMobxWrapper<{
		listContactInformations: ContactInformation[];
	}>;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);

		this.query = ApolloMobxWrapper.create<{
			listContactInformations: ContactInformation[];
		}>(rootStore.client, {
			query: GET_CONTACT_INFORMATION,
		});
	}

	@computed
	get data(): ContactInformation | null {
		return this.query.data?.listContactInformations?.[0] ?? null;
	}

	get loading(): boolean {
		return this.query.loading;
	}

	async upsert(input: ContactInformationInput): Promise<void> {
		await this.rootStore.client.mutate({
			mutation: UPSERT_CONTACT_INFORMATION,
			variables: { input },
		});
		await this.query.refetch();
	}
}
