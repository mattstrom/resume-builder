import { Auth0Client } from '@auth0/auth0-spa-js';
import type { User } from '@auth0/auth0-react';
import { action, computed, makeObservable, observable } from 'mobx';
import type { RootStore } from './root.store.ts';

export class AuthStore {
	@observable isLoading = true;
	@observable isAuthenticated = false;
	@observable user: User | undefined = undefined;

	private auth0Client: Auth0Client;
	private _loginWithRedirect: (() => Promise<void>) | null = null;
	private _logoutHandler: ((options?: any) => Promise<void>) | null = null;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);

		const { domain, clientId, audience, scope } = __CONFIG__.auth0;
		this.auth0Client = new Auth0Client({
			domain,
			clientId,
			cacheLocation: 'localstorage',
			useRefreshTokens: true,
			authorizationParams: {
				audience,
				scope,
			},
		});
	}

	/**
	 * Called by Auth0SyncProvider to push React Auth0 state into MobX.
	 */
	@action
	syncFromAuth0(state: {
		isLoading: boolean;
		isAuthenticated: boolean;
		user: User | undefined;
	}) {
		this.isLoading = state.isLoading;
		this.isAuthenticated = state.isAuthenticated;
		this.user = state.user;
	}

	/**
	 * Token retrieval -- uses Auth0Client directly (works outside React).
	 */
	async ensureToken(): Promise<string> {
		return this.auth0Client.getTokenSilently({
			authorizationParams: {
				audience: __CONFIG__.auth0.audience,
				scope: __CONFIG__.auth0.scope,
			},
		});
	}

	setLoginHandler(handler: () => Promise<void>) {
		this._loginWithRedirect = handler;
	}

	setLogoutHandler(handler: (options?: any) => Promise<void>) {
		this._logoutHandler = handler;
	}

	async login() {
		if (this._loginWithRedirect) {
			return this._loginWithRedirect();
		}
		await this.auth0Client.loginWithRedirect();
	}

	async logout(returnTo?: string) {
		const params = {
			logoutParams: {
				returnTo: returnTo ?? window.location.origin + '/logout',
			},
		};

		if (this._logoutHandler) {
			return this._logoutHandler(params);
		}
		await this.auth0Client.logout(params);
	}

	@computed
	get userInitial(): string {
		return this.user?.name?.charAt(0)?.toUpperCase() ?? '?';
	}
}
