import {
	ApolloClient,
	ApolloLink,
	HttpLink,
	InMemoryCache,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { ensureAuthToken } from './utils/auth';

const authLink = setContext(async (_, { headers }) => {
	try {
		const token = await ensureAuthToken();
		return {
			headers: {
				...headers,
				Authorization: `Bearer ${token}`,
			},
		};
	} catch {
		return { headers };
	}
});

const httpLink = new HttpLink({ uri: __CONFIG__.graphqlUrl });

export const client = new ApolloClient({
	link: ApolloLink.from([authLink, httpLink]),
	cache: new InMemoryCache(),
});
