import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import config from '../configuration.js';
import { EmbeddingService } from '../modules/facts/embedding.service.js';
import { FactsModule } from '../modules/facts/facts.module.js';
import { type FactConceptWithConcept, FactsService } from '../modules/facts/facts.service.js';
import { PrismaModule, PrismaService } from '../modules/prisma/index.js';

const SCHEMA = 'resume_builder';

interface FactRow {
	id: string;
	uid: string;
	what: string;
	impact: string | null;
	scale: string | null;
	concepts: FactConceptWithConcept[];
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

	const factRows = await prisma.$queryRawUnsafe<Omit<FactRow, 'concepts'>[]>(
		`SELECT id, uid, what, impact, scale
     FROM "${SCHEMA}"."Fact"
     WHERE embedding IS NULL`,
	);
	const conceptLinks = await prisma.factConcept.findMany({
		where: { factId: { in: factRows.map((fact) => fact.id) } },
		include: { concept: true },
	});
	const facts = factRows.map((fact) => ({
		...fact,
		concepts: conceptLinks.filter((link) => link.factId === fact.id),
	}));

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
