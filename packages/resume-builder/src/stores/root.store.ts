import { ApolloClient } from '@apollo/client';
import { client as apolloClient } from '../apollo-client.ts';
import { AuthStore } from './auth.store.ts';
import { ResumeStore } from './resume.store.ts';

let singleton: RootStore;

export class RootStore {
	public readonly client: ApolloClient;

	public readonly authStore: AuthStore;
	public readonly resumeStore: ResumeStore;

	constructor(client?: ApolloClient) {
		this.client = client ?? apolloClient;
		this.authStore = new AuthStore(this);
		this.resumeStore = new ResumeStore(this);

		if (import.meta.env.DEV) {
			globalThis.rootStore = this;
		}
	}

	static getInstance() {
		singleton ??= new RootStore();
		return singleton;
	}
}
