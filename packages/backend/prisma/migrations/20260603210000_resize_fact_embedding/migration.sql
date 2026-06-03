-- Resize embedding column from vector(1536) to vector(768) to match fastembed bge-base-en-v1.5
ALTER TABLE "resume_builder"."Fact" DROP COLUMN "embedding";
ALTER TABLE "resume_builder"."Fact" ADD COLUMN "embedding" vector(768);
