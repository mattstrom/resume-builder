import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import config from '../configuration.js';
import { PrismaModule } from '../modules/prisma/index.js';
import { BullConnectionModule } from '../modules/queue/bull-connection.module.js';
import { EmbeddingDocumentsService } from '../modules/queue/embeddings/embedding-documents.service.js';
import { EmbeddingQueueService } from '../modules/queue/embeddings/embedding-queue.service.js';
import type { EmbeddingEntityType } from '../modules/queue/embeddings/embedding.constants.js';
import { EmbeddingsModule } from '../modules/queue/embeddings/embeddings.module.js';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, load: [() => config] }),
		PrismaModule,
		BullConnectionModule,
		EmbeddingsModule,
	],
})
class BackfillModule {}

async function bootstrap() {
	const app = await NestFactory.createApplicationContext(BackfillModule, {
		logger: ['error', 'warn'],
	});

	const rawType = process.argv[2];
	const entityTypes: EmbeddingEntityType[] = ['fact', 'job-requirement', 'bullet', 'concept'];
	if (rawType && !entityTypes.includes(rawType as EmbeddingEntityType)) {
		throw new Error(`Unknown entity type "${rawType}". Use ${entityTypes.join(', ')}.`);
	}
	const requestedType = rawType as EmbeddingEntityType | undefined;
	const requestedLimit = Number(process.argv[3] ?? 10_000);
	const documents = app.get(EmbeddingDocumentsService);
	const queue = app.get(EmbeddingQueueService);
	const targets = await documents.findStaleTargets(requestedType, requestedLimit);
	await queue.enqueueMany(targets);
	console.log(`Enqueued ${targets.length} stale embedding targets.`);
	await app.close();
}

bootstrap().catch((err) => {
	console.error(err);
	process.exit(1);
});
