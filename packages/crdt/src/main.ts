import { INestApplicationContext } from '@nestjs/common';
import { Database } from '@hocuspocus/extension-database';
import { Server } from '@hocuspocus/server';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

function createServer(app: INestApplicationContext) {
	return new Server({
		name: 'hocuspocus',
		port: 1234,
		extensions: [new Database({})],
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
