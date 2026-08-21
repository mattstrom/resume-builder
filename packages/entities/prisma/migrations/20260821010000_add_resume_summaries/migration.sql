ALTER TABLE "Resume"
ADD COLUMN "summary" JSONB,
ADD COLUMN "lastSummarizedAt" TIMESTAMP(3);
