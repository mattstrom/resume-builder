import {
	ApolloClient,
	ApolloLink,
	HttpLink,
	InMemoryCache,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

type TokenGetter = () => Promise<string>;

let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter) {
	tokenGetter = getter;
}

const authLink = setContext(async (_, { headers }) => {
	if (!tokenGetter) return { headers };

	try {
		const token = await tokenGetter();
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
