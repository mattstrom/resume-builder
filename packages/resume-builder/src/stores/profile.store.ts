import { HocuspocusProvider } from '@hocuspocus/provider';
import { action, makeObservable, observable, runInAction } from 'mobx';
import * as Y from 'yjs';

import type { RootStore } from './root.store.ts';

export type ProfileConnectionStatus =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'disconnected';

const NARRATIVE_FIELD = 'narrative';
const JOB_PREFERENCES_FIELD = 'jobPreferences';

export class ProfileStore {
	@observable
	status: ProfileConnectionStatus = 'idle';

	@observable.ref
	doc: Y.Doc | null = null;

	@observable.ref
	provider: HocuspocusProvider | null = null;

	@observable
	isSynced = false;

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);
	}

	get narrativeFragment(): Y.XmlFragment | null {
		return this.doc?.getXmlFragment(NARRATIVE_FIELD) ?? null;
	}

	get jobPreferencesMap(): Y.Map<unknown> | null {
		return this.doc?.getMap(JOB_PREFERENCES_FIELD) ?? null;
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
				runInAction(() => {
					this.isSynced = true;
				});
			},
		});

		runInAction(() => {
			this.status = 'connecting';
			this.doc = doc;
			this.provider = provider;
		});
	}

	@action
	disconnect(): void {
		this.provider?.destroy();
		this.provider = null;
		this.doc?.destroy();
		this.doc = null;
		this.isSynced = false;
		this.status = 'idle';
	}
}
