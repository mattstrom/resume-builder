-- Add typed qualifier payloads to candidate-side concept assertions.
ALTER TABLE "FactConcept" ADD COLUMN "qualifier" JSONB;
ALTER TABLE "BulletConcept" ADD COLUMN "qualifier" JSONB;

-- Add job-side assertions into the shared concept graph.
CREATE TABLE "JobRequirementConcept" (
    "jobRequirementId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'classifier',
    "confidence" DOUBLE PRECISION,
    "qualifier" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRequirementConcept_pkey"
        PRIMARY KEY ("jobRequirementId", "conceptId", "relation")
);

CREATE INDEX "JobRequirementConcept_conceptId_relation_idx"
    ON "JobRequirementConcept"("conceptId", "relation");

ALTER TABLE "JobRequirementConcept"
    ADD CONSTRAINT "JobRequirementConcept_jobRequirementId_fkey"
    FOREIGN KEY ("jobRequirementId") REFERENCES "JobRequirementFact"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobRequirementConcept"
    ADD CONSTRAINT "JobRequirementConcept_conceptId_fkey"
    FOREIGN KEY ("conceptId") REFERENCES "Concept"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve concepts from requirement facts extracted before assertions existed.
INSERT INTO "Concept" (
    "id", "vocabulary", "key", "label", "embeddingRevision", "createdAt", "updatedAt"
)
SELECT DISTINCT
    'legacy-' || md5('technology:' || technology),
    'technology',
    technology,
    technology,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "JobRequirementFact", unnest("technologies") AS technology
WHERE technology <> ''
ON CONFLICT ("vocabulary", "key") DO NOTHING;

INSERT INTO "Concept" (
    "id", "vocabulary", "key", "label", "embeddingRevision", "createdAt", "updatedAt"
)
SELECT DISTINCT
    'legacy-' || md5('topic:' || tag),
    'topic',
    tag,
    initcap(replace(tag, '-', ' ')),
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "JobRequirementFact", unnest("tags") AS tag
WHERE tag <> ''
ON CONFLICT ("vocabulary", "key") DO NOTHING;

INSERT INTO "JobRequirementConcept" (
    "jobRequirementId", "conceptId", "relation", "source", "confidence"
)
SELECT DISTINCT
    requirement.id,
    concept.id,
    CASE requirement.kind
        WHEN 'required' THEN 'requires'
        WHEN 'preferred' THEN 'prefers'
        ELSE 'expects'
    END,
    'legacy-extraction',
    1.0
FROM "JobRequirementFact" requirement
CROSS JOIN LATERAL unnest(requirement."technologies") AS technology
JOIN "Concept" concept
    ON concept.vocabulary = 'technology' AND concept.key = technology
ON CONFLICT DO NOTHING;

INSERT INTO "JobRequirementConcept" (
    "jobRequirementId", "conceptId", "relation", "source", "confidence"
)
SELECT DISTINCT
    requirement.id,
    concept.id,
    CASE requirement.kind
        WHEN 'required' THEN 'requires'
        WHEN 'preferred' THEN 'prefers'
        ELSE 'expects'
    END,
    'legacy-extraction',
    0.9
FROM "JobRequirementFact" requirement
CROSS JOIN LATERAL unnest(requirement."tags") AS tag
JOIN "Concept" concept
    ON concept.vocabulary = 'topic' AND concept.key = tag
ON CONFLICT DO NOTHING;
