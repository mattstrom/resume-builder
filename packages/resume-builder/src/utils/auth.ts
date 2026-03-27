import { RootStore } from '../stores/root.store.ts';

/**
 * Fetches the current access token from the Auth0 cache.
 * Safe to call from route loaders (outside React).
 */
export async function ensureAuthToken(): Promise<string> {
	return RootStore.getInstance().authStore.ensureToken();
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
