import type {
	ISessionProvider,
	ISSOProvider,
	Session,
	SSOCallbackResult,
	SSOLoginConfig,
} from '@mastra/core/auth';
import {
	MastraAuthProvider,
	type MastraAuthProviderOptions,
} from '@mastra/core/server';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { createHash, randomBytes } from 'node:crypto';

export type Auth0JwtUser = JWTPayload;

export interface Auth0JwtProviderOptions extends MastraAuthProviderOptions<Auth0JwtUser> {
	domain: string;
	audience: string;
	clientId: string;
	clientSecret?: string;
}

export interface Auth0Session extends Session {
	accessToken: string;
	idToken?: string;
}

export class Auth0JwtProvider
	extends MastraAuthProvider<Auth0JwtUser>
	implements ISSOProvider<Auth0JwtUser>, ISessionProvider<Auth0Session>
{
	readonly #domain: string;
	readonly #audience: string;
	readonly #clientId: string;
	readonly #clientSecret: string | undefined;
	readonly #jwks: ReturnType<typeof createRemoteJWKSet>;
	readonly #issuer: string;

	// Keyed by OAuth state param; created in getLoginUrl, consumed in getLoginCookies
	readonly #pkceCache = new Map<
		string,
		{ codeVerifier: string; codeChallenge: string }
	>();
	// Written by setCallbackCookieHeader, read by handleCallback (same request)
	#pkceData: { codeVerifier: string; redirectUri: string } | null = null;

	constructor(options: Auth0JwtProviderOptions) {
		super({ name: options.name ?? 'auth0-jwt', ...options });
		if (!options.domain || !options.audience || !options.clientId) {
			throw new Error(
				'Auth0JwtProvider: domain, audience, and clientId are required',
			);
		}
		this.#domain = options.domain;
		this.#audience = options.audience;
		this.#clientId = options.clientId;
		this.#clientSecret = options.clientSecret;
		this.#issuer = `https://${options.domain}/`;
		this.#jwks = createRemoteJWKSet(
			new URL(`https://${options.domain}/.well-known/jwks.json`),
		);
	}

	// ============================================================================
	// MastraAuthProvider
	// ============================================================================

	async authenticateToken(token: string): Promise<Auth0JwtUser | null> {
		if (!token || typeof token !== 'string') return null;
		try {
			const { payload } = await jwtVerify(token, this.#jwks, {
				issuer: this.#issuer,
				audience: this.#audience,
			});
			return payload;
		} catch {
			return null;
		}
	}

	authorizeUser(user: Auth0JwtUser): boolean {
		if (!user?.sub) return false;
		if (user.exp && user.exp * 1000 < Date.now()) return false;
		return true;
	}

	mapUserToResourceId(user: Auth0JwtUser): string | undefined {
		return user.sub ?? undefined;
	}

	// ============================================================================
	// ISSOProvider — Auth0 authorization code flow with PKCE
	// ============================================================================

	getLoginUrl(redirectUri: string, state: string): string {
		const { codeChallenge } = this.#getOrCreatePkce(state);
		const params = new URLSearchParams({
			client_id: this.#clientId,
			redirect_uri: redirectUri,
			response_type: 'code',
			scope: 'openid profile email offline_access',
			audience: this.#audience,
			state,
			code_challenge: codeChallenge,
			code_challenge_method: 'S256',
		});
		return `https://${this.#domain}/authorize?${params}`;
	}

	getLoginCookies(redirectUri: string, state: string): string[] {
		const { codeVerifier } = this.#getOrCreatePkce(state);
		this.#pkceCache.delete(state);
		const value = Buffer.from(
			JSON.stringify({ codeVerifier, redirectUri }),
		).toString('base64');
		return [`auth0_pkce=${value}; HttpOnly; SameSite=Lax; Path=/`];
	}

	// Called by Mastra's callback handler before handleCallback()
	setCallbackCookieHeader(cookieHeader: string | null): void {
		if (!cookieHeader) return;
		const match = cookieHeader.match(/(?:^|;\s*)auth0_pkce=([^;]+)/);
		if (!match) return;
		try {
			this.#pkceData = JSON.parse(
				Buffer.from(match[1], 'base64').toString(),
			) as { codeVerifier: string; redirectUri: string };
		} catch {
			// malformed cookie — handleCallback will throw
		}
	}

	async handleCallback(
		code: string,
		_state: string,
	): Promise<SSOCallbackResult<Auth0JwtUser>> {
		const pkce = this.#pkceData;
		this.#pkceData = null;

		if (!pkce) {
			throw new Error(
				'PKCE data missing — auth0_pkce cookie was not forwarded to the callback',
			);
		}

		const body: Record<string, string> = {
			grant_type: 'authorization_code',
			client_id: this.#clientId,
			code,
			redirect_uri: pkce.redirectUri,
			code_verifier: pkce.codeVerifier,
		};
		if (this.#clientSecret) body['client_secret'] = this.#clientSecret;

		const response = await fetch(`https://${this.#domain}/oauth/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Auth0 token exchange failed: ${text}`);
		}

		const data = (await response.json()) as {
			access_token: string;
			id_token?: string;
			refresh_token?: string;
			expires_in?: number;
		};

		const user = await this.authenticateToken(data.access_token);
		if (!user)
			throw new Error(
				'Access token failed JWKS verification after exchange',
			);

		return {
			user,
			tokens: {
				accessToken: data.access_token,
				idToken: data.id_token,
				refreshToken: data.refresh_token,
				expiresAt:
					data.expires_in != null
						? new Date(Date.now() + data.expires_in * 1000)
						: undefined,
			},
		};
	}

	getLoginButtonConfig(): SSOLoginConfig {
		return { provider: 'auth0', text: 'Sign in with Auth0' };
	}

	getLogoutUrl(redirectUri: string): string {
		const params = new URLSearchParams({
			client_id: this.#clientId,
			returnTo: redirectUri,
		});
		return `https://${this.#domain}/v2/logout?${params}`;
	}

	// ============================================================================
	// ISessionProvider — JWT-as-session (stateless, no server-side storage)
	//
	// The "session ID" is the raw access token. Mastra stores it in a cookie
	// and passes it back to authenticateToken on each request.
	// ============================================================================

	async createSession(
		userId: string,
		metadata?: Record<string, unknown>,
	): Promise<Auth0Session> {
		const accessToken = (metadata?.['accessToken'] as string) ?? '';
		const user = await this.authenticateToken(accessToken);
		const sub = user?.sub ?? userId ?? 'unknown';
		const exp = typeof user?.exp === 'number' ? user.exp : undefined;
		return {
			id: accessToken,
			userId: sub,
			accessToken,
			idToken: metadata?.['idToken'] as string | undefined,
			expiresAt: exp
				? new Date(exp * 1000)
				: new Date(Date.now() + 3600 * 1000),
			createdAt: new Date(),
		};
	}

	async validateSession(sessionId: string): Promise<Auth0Session | null> {
		const user = await this.authenticateToken(sessionId);
		if (!user) return null;
		const exp = typeof user.exp === 'number' ? user.exp : undefined;
		return {
			id: sessionId,
			userId: user.sub ?? 'unknown',
			accessToken: sessionId,
			expiresAt: exp
				? new Date(exp * 1000)
				: new Date(Date.now() + 3600 * 1000),
			createdAt: new Date(),
		};
	}

	async destroySession(_sessionId: string): Promise<void> {
		// JWTs are stateless — nothing to revoke server-side
	}

	async refreshSession(sessionId: string): Promise<Auth0Session | null> {
		return this.validateSession(sessionId);
	}

	getSessionIdFromRequest(request: Request): string | null {
		const cookie = request.headers.get('Cookie');
		if (!cookie) return null;
		const match = cookie.match(/(?:^|;\s*)auth0_session=([^;]+)/);
		return match?.[1] ?? null;
	}

	getSessionHeaders(session: Auth0Session): Record<string, string> {
		const expires = session.expiresAt
			? `; Expires=${session.expiresAt.toUTCString()}`
			: '';
		return {
			'Set-Cookie': `auth0_session=${session.accessToken}; HttpOnly; SameSite=Lax; Path=/${expires}`,
		};
	}

	getClearSessionHeaders(): Record<string, string> {
		return {
			'Set-Cookie':
				'auth0_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
		};
	}

	// ============================================================================
	// IUserProvider — duck-typed (JWTPayload doesn't extend User so no implements clause)
	// ============================================================================

	async getCurrentUser(request: Request): Promise<Auth0JwtUser | null> {
		const authHeader = request.headers.get('Authorization');
		if (authHeader) {
			const token = authHeader.replace(/^Bearer\s+/i, '').trim();
			if (token) return this.authenticateToken(token);
		}
		const sessionId = this.getSessionIdFromRequest(request);
		if (sessionId) return this.authenticateToken(sessionId);
		return null;
	}

	async getUser(_userId: string): Promise<Auth0JwtUser | null> {
		return null;
	}

	// ============================================================================
	// Private
	// ============================================================================

	#getOrCreatePkce(state: string): {
		codeVerifier: string;
		codeChallenge: string;
	} {
		if (!this.#pkceCache.has(state)) {
			const codeVerifier = randomBytes(32).toString('base64url');
			const codeChallenge = createHash('sha256')
				.update(codeVerifier)
				.digest('base64url');
			this.#pkceCache.set(state, { codeVerifier, codeChallenge });
		}
		return this.#pkceCache.get(state)!;
	}
}
