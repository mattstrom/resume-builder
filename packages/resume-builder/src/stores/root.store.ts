import { ApolloClient } from '@apollo/client';
import { client as apolloClient } from '../apollo-client.ts';

let singleton: RootStore;

export class RootStore {
	public readonly client: ApolloClient;

	constructor(client?: ApolloClient) {
		this.client = client ?? apolloClient;
	}

	static getInstance() {
		singleton ??= new RootStore();
		return singleton;
	}
}
