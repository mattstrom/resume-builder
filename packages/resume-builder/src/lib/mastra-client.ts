import { MastraClient } from '@mastra/client-js';

import { ensureAuthToken } from '../utils/auth.ts';

export async function getMastraClient(): Promise<MastraClient> {
	const token = await ensureAuthToken();

	return new MastraClient({
		baseUrl: __CONFIG__.mastraUrl,
		headers: { Authorization: `Bearer ${token}` },
	});
}
