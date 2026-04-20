import { INestApplicationContext } from '@nestjs/common';
import { Server } from '@hocuspocus/server';
import { NestFactory } from '@nestjs/core';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AppModule } from './app.module.js';
import { ApiService } from './modules/api/api.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { LoggingService } from './modules/logging/logging.service.js';
import { StorageService } from './modules/storage/storage.service.js';

// const auth0Domain = process.env.AUTH0_DOMAIN ?? 'login.mattstrom.com';
// const auth0Audience =
// 	process.env.AUTH0_AUDIENCE ?? 'https://resume-builder.mattstrom.com';
//
// async function verifyAccessToken(token: string) {
// 	const decoded = jwt.decode(token, { complete: true });
// 	const keyId =
// 		decoded && typeof decoded === 'object' && 'header' in decoded
// 			? (decoded.header as { kid?: string }).kid
// 			: undefined;
//
// 	if (!keyId) {
// 		throw new Error('Missing token key id');
// 	}
//
// 	const client = jwksClient({
// 		cache: true,
// 		rateLimit: true,
// 		jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
// 	});
// 	const signingKey = await client.getSigningKey(keyId);
//
// 	return jwt.verify(token, signingKey.getPublicKey(), {
// 		audience: auth0Audience,
// 		issuer: `https://${auth0Domain}/`,
// 		algorithms: ['RS256'],
// 	}) as JwtPayload;
// }

function createServer(app: INestApplicationContext) {
	const apiService = app.get(ApiService);
	const authService = app.get(AuthService);
	const loggingService = app.get(LoggingService);
	const storageService = app.get(StorageService);

	return new Server({
		name: 'hocuspocus',
		port: 1234,
		extensions: [apiService, authService, loggingService, storageService],
		async onDestroy() {
			await app.close();
		},
	});
}

async function bootstrap() {
	const app = await NestFactory.createApplicationContext(AppModule);
	const server = createServer(app);

	await server.listen();
}

bootstrap();
