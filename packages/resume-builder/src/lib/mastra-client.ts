import { MastraClient } from '@mastra/client-js';

import { ensureAuthToken } from '../utils/auth.ts';

const MASTRA_BASE_URL = 'http://localhost:4111';

export async function getMastraClient(): Promise<MastraClient> {
	const token = await ensureAuthToken();

	return new MastraClient({
		baseUrl: MASTRA_BASE_URL,
		headers: { Authorization: `Bearer ${token}` },
	});
}
