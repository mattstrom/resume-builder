-- Move Fact classification and context into the concept graph. The legacy API
-- fields remain accepted by the application as write-time conveniences, but
-- these edges become the only persisted representation.

-- Fact.kind -> (`is-a`, `fact-type`).
INSERT INTO "Concept" (
    "id", "vocabulary", "key", "label", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (normalized_key)
    CONCAT('fact-type:', MD5(normalized_key)),
    'fact-type',
    normalized_key,
    BTRIM("kind"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        "kind",
        TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(BTRIM("kind")), '[^a-z0-9]+', '-', 'g'))
            AS normalized_key
    FROM "Fact"
) AS fact_types
WHERE normalized_key <> ''
ORDER BY normalized_key, "kind"
ON CONFLICT ("vocabulary", "key") DO NOTHING;

INSERT INTO "FactConcept" (
    "factId", "conceptId", "relation", "source", "confidence", "createdAt"
)
SELECT
    fact."id",
    concept."id",
    'is-a',
    'legacy-migration',
    1,
    CURRENT_TIMESTAMP
FROM "Fact" AS fact
JOIN "Concept" AS concept
    ON concept."vocabulary" = 'fact-type'
    AND concept."key" = TRIM(
        BOTH '-' FROM REGEXP_REPLACE(LOWER(BTRIM(fact."kind")), '[^a-z0-9]+', '-', 'g')
    )
ON CONFLICT ("factId", "conceptId", "relation") DO NOTHING;

-- Fact.tags -> (`about`, `topic`).
INSERT INTO "Concept" (
    "id", "vocabulary", "key", "label", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (normalized_key)
    CONCAT('topic:', MD5(normalized_key)),
    'topic',
    normalized_key,
    BTRIM(tag),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        tag,
        TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(BTRIM(tag)), '[^a-z0-9]+', '-', 'g'))
            AS normalized_key
    FROM "Fact"
    CROSS JOIN LATERAL UNNEST("tags") AS tags(tag)
) AS topics
WHERE normalized_key <> ''
ORDER BY normalized_key, tag
ON CONFLICT ("vocabulary", "key") DO NOTHING;

INSERT INTO "FactConcept" (
    "factId", "conceptId", "relation", "source", "confidence", "createdAt"
)
SELECT
    fact."id",
    concept."id",
    'about',
    'legacy-migration',
    1,
    CURRENT_TIMESTAMP
FROM "Fact" AS fact
CROSS JOIN LATERAL UNNEST(fact."tags") AS tags(tag)
JOIN "Concept" AS concept
    ON concept."vocabulary" = 'topic'
    AND concept."key" = TRIM(
        BOTH '-' FROM REGEXP_REPLACE(LOWER(BTRIM(tag)), '[^a-z0-9]+', '-', 'g')
    )
ON CONFLICT ("factId", "conceptId", "relation") DO NOTHING;

-- Fact.entityType/entityId -> (`relates-to`, `entity`). The type is part of
-- the stable key because the same external identifier can exist in two source
-- collections. `*` preserves a type-only legacy reference.
INSERT INTO "Concept" (
    "id", "vocabulary", "key", "label", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (entity_key)
    CONCAT('entity:', MD5(entity_key)),
    'entity',
    entity_key,
    entity_label,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        CONCAT(
            LOWER(COALESCE(NULLIF(BTRIM("entityType"), ''), 'unknown')),
            ':',
            COALESCE(NULLIF(BTRIM("entityId"), ''), '*')
        ) AS entity_key,
        COALESCE(
            NULLIF(BTRIM("entityId"), ''),
            NULLIF(BTRIM("entityType"), ''),
            'Unknown entity'
        ) AS entity_label
    FROM "Fact"
    WHERE NULLIF(BTRIM("entityType"), '') IS NOT NULL
       OR NULLIF(BTRIM("entityId"), '') IS NOT NULL
) AS entities
ORDER BY entity_key, entity_label
ON CONFLICT ("vocabulary", "key") DO NOTHING;

INSERT INTO "FactConcept" (
    "factId", "conceptId", "relation", "source", "confidence", "createdAt"
)
SELECT
    fact."id",
    concept."id",
    'relates-to',
    'legacy-migration',
    1,
    CURRENT_TIMESTAMP
FROM "Fact" AS fact
JOIN "Concept" AS concept
    ON concept."vocabulary" = 'entity'
    AND concept."key" = CONCAT(
        LOWER(COALESCE(NULLIF(BTRIM(fact."entityType"), ''), 'unknown')),
        ':',
        COALESCE(NULLIF(BTRIM(fact."entityId"), ''), '*')
    )
WHERE NULLIF(BTRIM(fact."entityType"), '') IS NOT NULL
   OR NULLIF(BTRIM(fact."entityId"), '') IS NOT NULL
ON CONFLICT ("factId", "conceptId", "relation") DO NOTHING;

DROP INDEX IF EXISTS "Fact_entityId_idx";

ALTER TABLE "Fact"
    DROP COLUMN "kind",
    DROP COLUMN "entityType",
    DROP COLUMN "entityId",
    DROP COLUMN "tags",
    DROP COLUMN "technologies";
