import {
	Auth0Client,
	createAuth0Client,
	type Auth0ClientOptions,
} from '@auth0/auth0-spa-js';
import type {
	GetTokenSilentlyOptions,
	RedirectLoginOptions,
	User,
} from '@auth0/auth0-react';
import { action, computed, makeObservable, observable, when } from 'mobx';
import { BehaviorSubject } from 'rxjs';
import type { RootStore } from './root.store.ts';

const authOptions: Auth0ClientOptions = {
	domain: __CONFIG__.auth0.domain,
	clientId: __CONFIG__.auth0.clientId,
	cacheLocation: 'localstorage',
	useRefreshTokens: true,
	authorizationParams: {
		redirect_uri: window.location.origin,
		audience: __CONFIG__.auth0.audience,
		scope: __CONFIG__.auth0.scope,
	},
};

export class AuthStore {
	@observable isInitialized = false;
	@observable isAuthenticated = false;
	@observable user: User | undefined = undefined;

	public token$ = new BehaviorSubject<string | null>(null);
	private auth0Client!: Auth0Client;

	constructor(readonly rootStore: RootStore) {
		makeObservable(this);
		this.initialize();
	}

	@action
	private async initialize(): Promise<void> {
		this.auth0Client = await createAuth0Client(authOptions);

		if (window.location.search.includes('code=')) {
			try {
				const result = await this.auth0Client.handleRedirectCallback();
				await this.onRedirectCallback(result.appState).catch(() =>
					this.logout(),
				);
			} catch (error) {
				console.error('Error handling redirect callback:', error);
				throw error;
			}
		} else if (window.location.search.includes('error=')) {
			console.error('Error occurred while logging in.');
			this.logout();
			return;
		}

		try {
			await this.auth0Client.getTokenSilently();
		} catch (error) {
			console.error('Error retrieving token silently:', error);

			await this.auth0Client.loginWithRedirect();
			return;
		}

		this.isAuthenticated = await this.auth0Client.isAuthenticated();
		this.user = await this.auth0Client.getUser();
		this.isInitialized = true;
	}

	onRedirectCallback = async (state: any = {}) => {
		window.history.replaceState(
			state,
			document.title,
			state?.redirectUrl ?? window.location.pathname,
		);
	};

	/**
	 * Token retrieval -- uses Auth0Client directly (works outside React).
	 */
	async ensureToken(): Promise<string> {
		await when(() => this.isInitialized);
		return this.auth0Client.getTokenSilently();
	}

	@action
	async getIdTokenClaims() {
		return this.auth0Client!.getIdTokenClaims();
	}

	@action
	async getTokenSilently(options?: GetTokenSilentlyOptions): Promise<string> {
		try {
			const token = await this.auth0Client.getTokenSilently(options);
			this.token$.next(token);

			return token;
		} catch (err) {
			console.error(err);
			throw err;
		}
	}

	@action
	async login(options?: RedirectLoginOptions) {
		await when(() => this.isInitialized);
		await this.auth0Client.loginWithRedirect(options);
	}

	@action
	async logout(returnTo?: string) {
		await this.auth0Client?.logout({
			logoutParams: {
				client_id: authOptions.clientId,
				returnTo: returnTo ?? `${window.location.origin}/logout`,
			},
		});
	}

	@computed
	get userInitial(): string {
		return this.user?.name?.charAt(0)?.toUpperCase() ?? '?';
	}
}
