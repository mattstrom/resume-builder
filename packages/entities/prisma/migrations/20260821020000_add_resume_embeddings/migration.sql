ALTER TABLE "resume_builder"."Resume"
ADD COLUMN "embedding" "resume_builder".vector(768),
ADD COLUMN "embeddingRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "embeddedRevision" INTEGER,
ADD COLUMN "embeddingModel" TEXT,
ADD COLUMN "embeddingProfile" TEXT;
