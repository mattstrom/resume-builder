-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "vocabulary" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "definition" TEXT,
    "externalUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptAlias" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactConcept" (
    "factId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactConcept_pkey" PRIMARY KEY ("factId", "conceptId", "relation")
);

-- CreateTable
CREATE TABLE "ConceptRelation" (
    "sourceConceptId" TEXT NOT NULL,
    "targetConceptId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ontology',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptRelation_pkey" PRIMARY KEY ("sourceConceptId", "targetConceptId", "relation")
);

-- CreateIndex
CREATE UNIQUE INDEX "Concept_vocabulary_key_key" ON "Concept"("vocabulary", "key");

-- CreateIndex
CREATE INDEX "Concept_vocabulary_label_idx" ON "Concept"("vocabulary", "label");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptAlias_conceptId_normalizedLabel_key" ON "ConceptAlias"("conceptId", "normalizedLabel");

-- CreateIndex
CREATE INDEX "ConceptAlias_normalizedLabel_idx" ON "ConceptAlias"("normalizedLabel");

-- CreateIndex
CREATE INDEX "FactConcept_conceptId_relation_idx" ON "FactConcept"("conceptId", "relation");

-- CreateIndex
CREATE INDEX "ConceptRelation_targetConceptId_relation_idx" ON "ConceptRelation"("targetConceptId", "relation");

-- AddForeignKey
ALTER TABLE "ConceptAlias" ADD CONSTRAINT "ConceptAlias_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactConcept" ADD CONSTRAINT "FactConcept_factId_fkey" FOREIGN KEY ("factId") REFERENCES "Fact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactConcept" ADD CONSTRAINT "FactConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptRelation" ADD CONSTRAINT "ConceptRelation_sourceConceptId_fkey" FOREIGN KEY ("sourceConceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptRelation" ADD CONSTRAINT "ConceptRelation_targetConceptId_fkey" FOREIGN KEY ("targetConceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill normalized technology concepts from the existing compatibility column.
INSERT INTO "Concept" ("id", "vocabulary", "key", "label", "createdAt", "updatedAt")
SELECT
    CONCAT('technology:', MD5(technology)),
    'technology',
    technology,
    technology,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT UNNEST("technologies") AS technology
    FROM "Fact"
) AS existing_technologies
WHERE BTRIM(technology) <> ''
ON CONFLICT ("vocabulary", "key") DO NOTHING;

-- Preserve the existing Fact.technologies meaning as explicit `uses` edges.
INSERT INTO "FactConcept" ("factId", "conceptId", "relation", "source", "createdAt")
SELECT
    fact."id",
    concept."id",
    'uses',
    'legacy-migration',
    CURRENT_TIMESTAMP
FROM "Fact" AS fact
CROSS JOIN LATERAL UNNEST(fact."technologies") AS technologies(technology)
JOIN "Concept" AS concept
    ON concept."vocabulary" = 'technology'
    AND concept."key" = technology
ON CONFLICT ("factId", "conceptId", "relation") DO NOTHING;
