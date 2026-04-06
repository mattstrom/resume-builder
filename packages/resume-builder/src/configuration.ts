export interface Configuration {
	graphqlUrl: string;
	auth0: {
		domain: string;
		clientId: string;
		audience: string;
		scope: string;
	};
}
