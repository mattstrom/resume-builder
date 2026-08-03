-- PrismaPg's `schema` option qualifies client queries but does not set the
-- PostgreSQL session search_path. Schema-qualify persistent trigger bodies so
-- they resolve these tables independently of the caller's search_path.

CREATE OR REPLACE FUNCTION "resume_builder"."bump_concept_embedding_revision"()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'ConceptAlias' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE "resume_builder"."Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id = NEW."conceptId";
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE "resume_builder"."Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id = OLD."conceptId";
        ELSE
            UPDATE "resume_builder"."Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id IN (OLD."conceptId", NEW."conceptId");
        END IF;
    ELSIF TG_TABLE_NAME = 'ConceptRelation' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE "resume_builder"."Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id IN (NEW."sourceConceptId", NEW."targetConceptId");
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE "resume_builder"."Concept"
            SET "embeddingRevision" = "embeddingRevision" + 1
            WHERE id IN (OLD."sourceConceptId", OLD."targetConceptId");
        ELSE
            UPDATE "resume_builder"."Concept"
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

CREATE OR REPLACE FUNCTION "resume_builder"."bump_descendant_concept_embedding_revisions"()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.label IS DISTINCT FROM NEW.label
       OR OLD.definition IS DISTINCT FROM NEW.definition THEN
        WITH RECURSIVE descendants(id) AS (
            SELECT relation."sourceConceptId"
            FROM "resume_builder"."ConceptRelation" relation
            WHERE relation."targetConceptId" = NEW.id
              AND relation.relation = 'broader'
            UNION
            SELECT relation."sourceConceptId"
            FROM descendants parent
            JOIN "resume_builder"."ConceptRelation" relation
              ON relation."targetConceptId" = parent.id
             AND relation.relation = 'broader'
        )
        UPDATE "resume_builder"."Concept"
        SET "embeddingRevision" = "embeddingRevision" + 1
        WHERE id IN (SELECT id FROM descendants);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
