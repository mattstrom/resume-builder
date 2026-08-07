import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockProviderOptions {
	onStatus: (event: { status: string }) => void;
	onSynced: () => void;
}

interface MockProvider {
	options: MockProviderOptions;
	destroy: ReturnType<typeof vi.fn>;
}

const { providers } = vi.hoisted(() => ({
	providers: [] as MockProvider[],
}));

vi.mock('@hocuspocus/provider', () => ({
	HocuspocusProvider: class {
		readonly awareness = {};
		readonly destroy = vi.fn();

		constructor(readonly options: MockProviderOptions) {
			providers.push(this);
		}
	},
}));

import { ProfileStore } from './profile.store.ts';

function createStore(ensureToken: () => Promise<string>): ProfileStore {
	return new ProfileStore({
		authStore: {
			ensureToken,
			user: { sub: 'user-1' },
		},
	} as never);
}

describe('ProfileStore connection lifecycle', () => {
	beforeEach(() => {
		providers.length = 0;
		vi.stubGlobal('__CONFIG__', {
			collaborationUrl: 'ws://localhost:1234',
		});
	});

	it('does not create a provider from an obsolete connection attempt', async () => {
		let resolveFirstToken!: (token: string) => void;
		const firstToken = new Promise<string>((resolve) => {
			resolveFirstToken = resolve;
		});
		const ensureToken = vi
			.fn<() => Promise<string>>()
			.mockImplementationOnce(() => firstToken)
			.mockResolvedValue('token');
		const store = createStore(ensureToken);

		const obsoleteConnection = store.connect();
		store.disconnect();
		await store.connect();
		resolveFirstToken('token');
		await obsoleteConnection;

		expect(providers).toHaveLength(1);
		expect(store.provider).toBe(providers[0]);
	});

	it('ignores synchronization callbacks from a disconnected provider', async () => {
		const store = createStore(async () => 'token');

		await store.connect();
		const obsoleteProvider = providers[0];
		store.disconnect();
		await store.connect();
		const activeProvider = providers[1];

		obsoleteProvider.options.onSynced();
		expect(store.isSynced).toBe(false);

		activeProvider.options.onSynced();
		expect(store.isSynced).toBe(true);
	});
});
