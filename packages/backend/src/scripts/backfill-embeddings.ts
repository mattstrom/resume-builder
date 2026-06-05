import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import config from '../configuration.js';
import { EmbeddingService } from '../modules/facts/embedding.service.js';
import { FactsModule } from '../modules/facts/facts.module.js';
import { FactsService } from '../modules/facts/facts.service.js';
import { PrismaModule, PrismaService } from '../modules/prisma/index.js';

const SCHEMA = 'resume_builder';

interface FactRow {
	id: string;
	uid: string;
	what: string;
	impact: string | null;
	scale: string | null;
	tags: string[];
	technologies: string[];
}

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, load: [() => config] }),
		PrismaModule,
		FactsModule,
	],
})
class BackfillModule {}

async function bootstrap() {
	const app = await NestFactory.createApplicationContext(BackfillModule, {
		logger: ['error', 'warn'],
	});

	const prisma = app.get(PrismaService);
	const factsService = app.get(FactsService);
	const embeddingService = app.get(EmbeddingService);

	const facts = await prisma.$queryRawUnsafe<FactRow[]>(
		`SELECT id, uid, what, impact, scale, tags, technologies
     FROM "${SCHEMA}"."Fact"
     WHERE embedding IS NULL`,
	);

	console.log(`Found ${facts.length} facts without embeddings`);

	let succeeded = 0;
	let failed = 0;

	for (let i = 0; i < facts.length; i++) {
		const fact = facts[i];
		try {
			const text = factsService.factToEmbeddingText(fact);
			const vector = await embeddingService.embed(text);
			await factsService.setEmbedding(fact.uid, fact.id, vector);
			succeeded++;
			console.log(`[${i + 1}/${facts.length}] ${fact.id}`);
		} catch (err) {
			failed++;
			console.error(`[${i + 1}/${facts.length}] ${fact.id} FAILED:`, err);
		}
	}

	console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);
	await app.close();
}

bootstrap().catch((err) => {
	console.error(err);
	process.exit(1);
});
