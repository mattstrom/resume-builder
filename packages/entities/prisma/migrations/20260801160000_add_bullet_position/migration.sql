-- AddColumn
ALTER TABLE "Bullet" ADD COLUMN "position" INTEGER;

-- Backfill a stable zero-based order within each source.
WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "uid", "sourceType", "sourceId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) - 1 AS "position"
    FROM "Bullet"
)
UPDATE "Bullet"
SET "position" = ranked."position"
FROM ranked
WHERE "Bullet"."id" = ranked."id";

ALTER TABLE "Bullet" ALTER COLUMN "position" SET DEFAULT 0;
ALTER TABLE "Bullet" ALTER COLUMN "position" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Bullet_uid_sourceType_sourceId_position_idx"
ON "Bullet"("uid", "sourceType", "sourceId", "position");
