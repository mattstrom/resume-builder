import { HocuspocusProvider } from '@hocuspocus/provider';
import { action, makeObservable, observable, runInAction } from 'mobx';
import * as Y from 'yjs';

import type { RootStore } from './root.store.ts';

export type ProfileConnectionStatus =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'disconnected';

const PROFILE_MAP_KEY = 'profile';
const NARRATIVE_KEY = 'narrative';

export class ProfileStore {
	@observable
	status: ProfileConnectionStatus = 'idle';

	@observable.ref
	narrativeText: Y.Text | null = null;

	@observable
	isSynced = false;

	private doc: Y.Doc | null = null;
	private provider: HocuspocusProvider | null = null;

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);
	}

	get awareness() {
		return this.provider?.awareness ?? null;
	}

	/**
	 * Open a collaborative session for the authenticated user's profile.
	 * Idempotent: calling while already connected is a no-op.
	 */
	@action
	async connect(): Promise<void> {
		if (this.provider) {
			return;
		}

		const token = await this.rootStore.authStore.ensureToken();
		const uid = this.rootStore.authStore.user?.sub;

		if (!uid) {
			throw new Error('Cannot open profile: no authenticated user');
		}

		const doc = new Y.Doc();
		this.doc = doc;

		// Pre-register the Y.Text so MonacoBinding can attach immediately.
		const profileMap = doc.getMap<Y.Text>(PROFILE_MAP_KEY);
		let text = profileMap.get(NARRATIVE_KEY);
		if (!(text instanceof Y.Text)) {
			text = new Y.Text();
			profileMap.set(NARRATIVE_KEY, text);
		}

		runInAction(() => {
			this.status = 'connecting';
			this.narrativeText = text!;
		});

		const provider = new HocuspocusProvider({
			url: __CONFIG__.collaborationUrl,
			name: `profile:${uid}`,
			document: doc,
			token,
			onStatus: ({ status }) => {
				runInAction(() => {
					this.status =
						status === 'connected'
							? 'connected'
							: status === 'connecting'
								? 'connecting'
								: 'disconnected';
				});
			},
			onSynced: () => {
				// Re-read the Y.Text in case the server replaced the map entry
				// with its authoritative version during the initial sync.
				const synced = doc
					.getMap<Y.Text>(PROFILE_MAP_KEY)
					.get(NARRATIVE_KEY);
				runInAction(() => {
					if (synced instanceof Y.Text) {
						this.narrativeText = synced;
					}
					this.isSynced = true;
				});
			},
		});

		this.provider = provider;
	}

	@action
	disconnect(): void {
		this.provider?.destroy();
		this.provider = null;
		this.doc?.destroy();
		this.doc = null;
		this.narrativeText = null;
		this.isSynced = false;
		this.status = 'idle';
	}
}
