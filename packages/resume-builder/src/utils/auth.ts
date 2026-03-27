import { Auth0Client } from '@auth0/auth0-spa-js';

let auth0Client: Auth0Client | null = null;

function getAuth0Client(): Auth0Client {
	if (!auth0Client) {
		const { domain, clientId, audience } = __CONFIG__.auth0;
		auth0Client = new Auth0Client({
			domain,
			clientId,
			cacheLocation: 'localstorage',
			useRefreshTokens: true,
			authorizationParams: {
				audience,
			},
		});
	}
	return auth0Client;
}

/**
 * Fetches the current access token from the Auth0 cache.
 * Safe to call from route loaders (outside React).
 */
export async function ensureAuthToken(): Promise<string> {
	return getAuth0Client().getTokenSilently({
		authorizationParams: {
			audience: __CONFIG__.auth0.audience,
		},
	});
}

export async function authFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const headers = new Headers(init?.headers);
	try {
		const token = await ensureAuthToken();
		headers.set('Authorization', `Bearer ${token}`);
	} catch {
		// If token retrieval fails, proceed without auth header
	}
	return fetch(input, { ...init, headers });
}
