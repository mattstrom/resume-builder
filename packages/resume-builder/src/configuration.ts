export interface Configuration {
	graphqlUrl: string;
	collaborationUrl: string;
	auth0: {
		domain: string;
		clientId: string;
		audience: string;
		scope: string;
	};
}
