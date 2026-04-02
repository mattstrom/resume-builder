import { Extension, onAuthenticatePayload } from '@hocuspocus/server';
import {
	UnauthorizedException,
	Injectable,
	Inject,
	ForbiddenException,
	BadRequestException,
} from '@nestjs/common';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import type winston from 'winston';

// import config from '~/config';
import { Logger } from '../logging/tokens.js';

const config = {
	auth0: {
		domain: 'login.mattstrom.com',
	},
};

@Injectable()
export class AuthService implements Extension {
	private jwksClient: JwksClient;
	private readonly logger: winston.Logger;

	constructor(@Inject(Logger) logger: winston.Logger) {
		this.logger = logger.child({ source: 'auth' });
		this.jwksClient = jwksClient({
			cache: true,
			rateLimit: true,
			jwksRequestsPerMinute: 5,
			jwksUri: `https://${config.auth0.domain}/.well-known/jwks.json`,
		});
	}

	async onAuthenticate(data: onAuthenticatePayload): Promise<void> {
		try {
			await this.authenticate(data);
		} catch (err) {
			if (err instanceof UnauthorizedException) {
				this.logger.warn('Authentication failed:', err.message);
			} else if (err instanceof ForbiddenException) {
				this.logger.error('Authorization failed:', err.message);
			}

			throw err;
		}
	}

	async authenticate(payload: onAuthenticatePayload): Promise<void> {
		const { token } = payload;

		if (!token) {
			throw new BadRequestException('No authentication token provided');
		}

		const decodedHeader = jwt.decode(token, { complete: true });

		if (!decodedHeader || typeof decodedHeader === 'string') {
			throw new UnauthorizedException();
		}

		try {
			const publicKey = await this.getKey(decodedHeader.header);
			const decoded = jwt.verify(token, publicKey, {
				algorithms: ['RS256'],
				issuer: `https://${config.auth0.domain}/`,
			}) as jwt.JwtPayload;

			payload.context.user = decoded;
		} catch (err) {
			throw new UnauthorizedException();
		}
	}

	private async getKey(header: jwt.JwtHeader): Promise<string> {
		const key = await this.jwksClient.getSigningKey(header.kid);
		return key.getPublicKey();
	}
}
