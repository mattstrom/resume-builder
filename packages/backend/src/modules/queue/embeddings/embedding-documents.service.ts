import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/index.js';
import {
	bulletEmbeddingText,
	conceptEmbeddingText,
	factEmbeddingText,
	jobRequirementEmbeddingText,
} from './embedding-documents.js';
import {
	EMBEDDING_MODEL,
	EMBEDDING_PROFILES,
	type EmbeddingEntityType,
	type EmbeddingProfile,
} from './embedding.constants.js';
import type {
	EmbeddingDocument,
	EmbeddingDocumentProvider,
	EmbeddingTarget,
} from './embedding.types.js';

const SCHEMA = 'resume_builder';

const ENTITY_TABLES: Record<EmbeddingEntityType, string> = {
	fact: 'Fact',
	'job-requirement': 'JobRequirementFact',
	bullet: 'Bullet',
	concept: 'Concept',
};

@Injectable()
export class EmbeddingDocumentsService implements EmbeddingDocumentProvider {
	constructor(private readonly prisma: PrismaService) {}

	async loadDocument(
		id: string,
		entityType: EmbeddingEntityType,
	): Promise<EmbeddingDocument | null> {
		switch (entityType) {
			case 'fact': {
				const fact = await this.prisma.fact.findUnique({
					where: { id },
					include: { concepts: { include: { concept: true } } },
				});
				return fact
					? {
							entityType,
							entityId: id,
							revision: fact.embeddingRevision,
							profile: EMBEDDING_PROFILES.fact,
							text: factEmbeddingText(fact),
						}
					: null;
			}
			case 'job-requirement': {
				const requirement = await this.prisma.jobRequirementFact.findUnique({
					where: { id },
				});
				return requirement
					? {
							entityType,
							entityId: id,
							revision: requirement.embeddingRevision,
							profile: EMBEDDING_PROFILES['job-requirement'],
							text: jobRequirementEmbeddingText(requirement),
						}
					: null;
			}
			case 'bullet': {
				const bullet = await this.prisma.bullet.findUnique({
					where: { id },
					include: { concepts: { include: { concept: true } } },
				});
				return bullet
					? {
							entityType,
							entityId: id,
							revision: bullet.embeddingRevision,
							profile: EMBEDDING_PROFILES.bullet,
							text: bulletEmbeddingText(bullet),
						}
					: null;
			}
			case 'concept': {
				const concept = await this.prisma.concept.findUnique({
					where: { id },
					include: {
						aliases: true,
						outgoingRelations: { include: { targetConcept: true } },
						incomingRelations: { include: { sourceConcept: true } },
					},
				});
				const ancestors = concept
					? await this.prisma.$queryRawUnsafe<Array<{ label: string }>>(
							`WITH RECURSIVE ancestors(id, label) AS (
                 SELECT parent.id, parent.label
                 FROM "${SCHEMA}"."ConceptRelation" relation
                 JOIN "${SCHEMA}"."Concept" parent
                   ON parent.id = relation."targetConceptId"
                 WHERE relation."sourceConceptId" = $1
                   AND relation.relation = 'broader'
                 UNION
                 SELECT parent.id, parent.label
                 FROM ancestors child
                 JOIN "${SCHEMA}"."ConceptRelation" relation
                   ON relation."sourceConceptId" = child.id
                  AND relation.relation = 'broader'
                 JOIN "${SCHEMA}"."Concept" parent
                   ON parent.id = relation."targetConceptId"
               )
               SELECT label FROM ancestors`,
							id,
						)
					: [];
				return concept
					? {
							entityType,
							entityId: id,
							revision: concept.embeddingRevision,
							profile: EMBEDDING_PROFILES.concept,
							text: conceptEmbeddingText({
								...concept,
								ancestorLabels: ancestors.map(({ label }) => label),
							}),
						}
					: null;
			}
		}
	}

	async saveIfCurrent(
		id: string,
		revision: number,
		profile: EmbeddingProfile,
		model: string,
		vector: number[],
		entityType: EmbeddingEntityType,
	): Promise<boolean> {
		const table = ENTITY_TABLES[entityType];
		const formatted = `[${vector.join(',')}]`;
		const updated = await this.prisma.$executeRawUnsafe(
			`UPDATE "${SCHEMA}"."${table}"
       SET embedding = $1::${SCHEMA}.vector,
           "embeddedRevision" = $2,
           "embeddingModel" = $3,
           "embeddingProfile" = $4
       WHERE id = $5 AND "embeddingRevision" = $2`,
			formatted,
			revision,
			model,
			profile,
			id,
		);
		return updated === 1;
	}

	async findStaleTargets(
		entityType?: EmbeddingEntityType,
		requestedLimit = 1000,
	): Promise<EmbeddingTarget[]> {
		const limit = Math.max(1, Math.min(requestedLimit, 10_000));
		const types = entityType
			? [entityType]
			: (Object.keys(EMBEDDING_PROFILES) as EmbeddingEntityType[]);
		const targets: EmbeddingTarget[] = [];

		for (const type of types) {
			if (targets.length >= limit) break;
			const table = ENTITY_TABLES[type];
			const profile = EMBEDDING_PROFILES[type];
			const rows = await this.prisma.$queryRawUnsafe<
				Array<{ id: string; embeddingRevision: number }>
			>(
				`SELECT id, "embeddingRevision"
         FROM "${SCHEMA}"."${table}"
         WHERE embedding IS NULL
            OR "embeddedRevision" IS DISTINCT FROM "embeddingRevision"
            OR "embeddingModel" IS DISTINCT FROM $1
            OR "embeddingProfile" IS DISTINCT FROM $2
         ORDER BY id
         LIMIT $3`,
				EMBEDDING_MODEL,
				profile,
				limit - targets.length,
			);
			targets.push(
				...rows.map((row) => ({
					entityType: type,
					entityId: row.id,
					revision: row.embeddingRevision,
					profile,
				})),
			);
		}

		return targets;
	}
}
