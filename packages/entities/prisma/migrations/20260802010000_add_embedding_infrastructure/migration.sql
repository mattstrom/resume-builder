-- Persist freshness metadata for asynchronous embedding generation. Existing
-- vectors intentionally remain present but are stale until the backfill worker
-- records a matching revision, model, and profile.

ALTER TABLE "Fact"
    ADD COLUMN "embeddingRevision" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "embeddedRevision" INTEGER,
    ADD COLUMN "embeddingModel" TEXT,
    ADD COLUMN "embeddingProfile" TEXT;

ALTER TABLE "JobRequirementFact"
    ADD COLUMN "embeddingRevision" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "embeddedRevision" INTEGER,
    ADD COLUMN "embeddingModel" TEXT,
    ADD COLUMN "embeddingProfile" TEXT;

ALTER TABLE "Bullet"
    ADD COLUMN "embedding" vector(768),
    ADD COLUMN "embeddingRevision" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "embeddedRevision" INTEGER,
    ADD COLUMN "embeddingModel" TEXT,
    ADD COLUMN "embeddingProfile" TEXT;

ALTER TABLE "Concept"
    ADD COLUMN "embedding" vector(768),
    ADD COLUMN "embeddingRevision" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "embeddedRevision" INTEGER,
    ADD COLUMN "embeddingModel" TEXT,
    ADD COLUMN "embeddingProfile" TEXT;

CREATE INDEX "Fact_embedding_cosine_idx"
    ON "Fact" USING hnsw ("embedding" vector_cosine_ops)
    WHERE "embedding" IS NOT NULL;

CREATE INDEX "JobRequirementFact_embedding_cosine_idx"
    ON "JobRequirementFact" USING hnsw ("embedding" vector_cosine_ops)
    WHERE "embedding" IS NOT NULL;

CREATE INDEX "Bullet_embedding_cosine_idx"
    ON "Bullet" USING hnsw ("embedding" vector_cosine_ops)
    WHERE "embedding" IS NOT NULL;

CREATE INDEX "Concept_embedding_cosine_idx"
    ON "Concept" USING hnsw ("embedding" vector_cosine_ops)
    WHERE "embedding" IS NOT NULL;

-- Alias and graph mutations can happen outside the entity services (for
-- example during ontology synchronization). Keep concept freshness correct at
-- the database boundary; the reconciliation worker will enqueue the new
-- revision if the caller does not enqueue it immediately.
CREATE OR REPLACE FUNCTION "bump_concept_embedding_revision"()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'ConceptAlias' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE "Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id = NEW."conceptId";
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE "Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id = OLD."conceptId";
        ELSE
            UPDATE "Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id IN (OLD."conceptId", NEW."conceptId");
        END IF;
    ELSIF TG_TABLE_NAME = 'ConceptRelation' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE "Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id IN (NEW."sourceConceptId", NEW."targetConceptId");
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE "Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id IN (OLD."sourceConceptId", OLD."targetConceptId");
        ELSE
            UPDATE "Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id IN (
                OLD."sourceConceptId",
                OLD."targetConceptId",
                NEW."sourceConceptId",
                NEW."targetConceptId"
            );
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ConceptAlias_embedding_revision"
AFTER INSERT OR UPDATE OR DELETE ON "ConceptAlias"
FOR EACH ROW EXECUTE FUNCTION "bump_concept_embedding_revision"();

CREATE TRIGGER "ConceptRelation_embedding_revision"
AFTER INSERT OR UPDATE OR DELETE ON "ConceptRelation"
FOR EACH ROW EXECUTE FUNCTION "bump_concept_embedding_revision"();

CREATE OR REPLACE FUNCTION "bump_descendant_concept_embedding_revisions"()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.label IS DISTINCT FROM NEW.label
       OR OLD.definition IS DISTINCT FROM NEW.definition THEN
        WITH RECURSIVE descendants(id) AS (
            SELECT relation."sourceConceptId"
            FROM "ConceptRelation" relation
            WHERE relation."targetConceptId" = NEW.id
              AND relation.relation = 'broader'
            UNION
            SELECT relation."sourceConceptId"
            FROM descendants parent
            JOIN "ConceptRelation" relation
              ON relation."targetConceptId" = parent.id
             AND relation.relation = 'broader'
        )
        UPDATE "Concept"
        SET "embeddingRevision" = "embeddingRevision" + 1
        WHERE id IN (SELECT id FROM descendants);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Concept_descendant_embedding_revisions"
AFTER UPDATE OF label, definition ON "Concept"
FOR EACH ROW EXECUTE FUNCTION "bump_descendant_concept_embedding_revisions"();
