import {
	ApolloClient,
	ApolloLink,
	HttpLink,
	InMemoryCache,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { getAuthToken } from './utils/auth';

const authLink = setContext(async (_, { headers }) => {
	const token = await getAuthToken();
	if (!token) return { headers };

	return {
		headers: {
			...headers,
			Authorization: `Bearer ${token}`,
		},
	};
});

const httpLink = new HttpLink({ uri: __CONFIG__.graphqlUrl });

export const client = new ApolloClient({
	link: ApolloLink.from([authLink, httpLink]),
	cache: new InMemoryCache(),
});
