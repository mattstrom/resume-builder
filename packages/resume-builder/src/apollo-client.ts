import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const client = new ApolloClient({
	link: new HttpLink({ uri: __CONFIG__.graphqlUrl }),
	cache: new InMemoryCache(),
});
