type TokenGetter = () => Promise<string>;

let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter) {
	tokenGetter = getter;
}

export async function getAuthToken(): Promise<string | null> {
	if (!tokenGetter) return null;
	try {
		return await tokenGetter();
	} catch {
		return null;
	}
}

export async function authFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const token = await getAuthToken();
	const headers = new Headers(init?.headers);
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}
	return fetch(input, { ...init, headers });
}
