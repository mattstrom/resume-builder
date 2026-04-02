export interface Configuration {
	graphqlUrl: string;
	crdtUrl: string;
	auth0: {
		domain: string;
		clientId: string;
		audience: string;
	};
}
