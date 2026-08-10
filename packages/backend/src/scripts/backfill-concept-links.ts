import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import config from '../configuration.js';
import { ConceptsService, ConceptVocabulary } from '../modules/concepts/concepts.service.js';
import { ProjectsService } from '../modules/entities/projects/projects.service.js';
import { SkillsService } from '../modules/entities/skills/skills.service.js';
import { PrismaModule } from '../modules/prisma/index.js';
import { PrismaService } from '../modules/prisma/index.js';
import type { EmbeddingQueueService } from '../modules/queue/embeddings/embedding-queue.service.js';

/**
 * Backfills concept links for rows written before the concept graph reached
 * skills and projects.
 *
 * Nothing here is derivable at read time: skills and projects only gained edges
 * on write, and `ConceptRelation` only gained ontology edges when a concept was
 * upserted, so existing data stays semantically invisible until this runs.
 * Every step is idempotent — edges are replaced, relations and aliases upserted
 * — so re-running after adding lexicon synonyms picks up the newly resolvable
 * labels without disturbing the rest.
 *
 * Postgres is the only service this needs. Importing `ConceptsModule` would drag
 * in `EmbeddingsModule` and open a Redis connection for a queue nothing here
 * pushes to, so the services are constructed directly against a queue stub.
 * Upserting an existing concept does bump its `embeddingRevision`, so follow a
 * run with `npm run script:backfill-embeddings` to re-embed what went stale.
 */
@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => config] }), PrismaModule],
})
class BackfillConceptLinksModule {}

/**
 * Stands in for the embedding queue, which this script never pushes to.
 *
 * Throwing rather than silently accepting: if a future edit to the write path
 * starts enqueueing, this should fail loudly instead of dropping the work.
 */
const queueStub = {
	enqueue() {
		throw new Error('backfill-concept-links must not enqueue embeddings');
	},
	enqueueMany() {
		throw new Error('backfill-concept-links must not enqueue embeddings');
	},
} as unknown as EmbeddingQueueService;

async function bootstrap() {
	const app = await NestFactory.createApplicationContext(BackfillConceptLinksModule, {
		logger: ['error', 'warn'],
	});

	const prisma = app.get(PrismaService);
	const concepts = new ConceptsService(prisma, queueStub);
	const skills = new SkillsService(prisma, concepts);
	const projects = new ProjectsService(prisma, concepts);

	// Ontology hierarchy first: skill and project resolution below reuses these
	// concepts, and the `broader` edges are what make indirect matching work.
	const technologies = await prisma.concept.findMany({
		where: { vocabulary: ConceptVocabulary.Technology },
		select: { id: true, vocabulary: true, key: true, label: true },
	});
	let linked = 0;
	for (const concept of technologies) {
		const ref = {
			vocabulary: concept.vocabulary,
			key: concept.key,
			label: concept.label,
		};
		if (concepts.ontologyAncestors(ref).length === 0) {
			continue;
		}

		await prisma.$transaction(async (tx) => {
			await concepts.lockConcepts(tx, [ref]);
			await concepts.linkOntologyHierarchy(tx, ref, concept.id);
		});
		linked += 1;
	}
	console.log(
		`Linked ontology ancestors for ${linked} of ${technologies.length} technology concepts.`,
	);

	const skillRows = await prisma.skill.findMany({
		select: { id: true, name: true },
	});
	let linkedSkills = 0;
	for (const skill of skillRows) {
		await prisma.$transaction((tx) => skills.syncConcepts(tx, skill.id, skill.name));
		linkedSkills += 1;
	}
	console.log(`Synced concepts for ${linkedSkills} skills.`);

	const projectRows = await prisma.project.findMany({
		select: { id: true, technologies: true },
	});
	let linkedProjects = 0;
	for (const project of projectRows) {
		await prisma.$transaction((tx) =>
			projects.syncConcepts(tx, project.id, project.technologies),
		);
		linkedProjects += 1;
	}
	console.log(`Synced concepts for ${linkedProjects} projects.`);

	const [relations, aliases] = await Promise.all([
		prisma.conceptRelation.count({ where: { relation: 'broader' } }),
		prisma.conceptAlias.count(),
	]);
	console.log(`ConceptRelation broader edges: ${relations}. ConceptAlias rows: ${aliases}.`);

	await app.close();
}

bootstrap().catch((err) => {
	console.error(err);
	process.exit(1);
});
