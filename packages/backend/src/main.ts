import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { configuration } from '@/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
	console.log(`Configuration:\n${configuration}`);

	const app = await NestFactory.create(AppModule, { cors: true });
	app.use(json({ limit: '10mb' }));
	app.use(urlencoded({ extended: true, limit: '10mb' }));
	await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
