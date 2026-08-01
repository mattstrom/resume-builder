-- CreateEnum
CREATE TYPE "BulletSourceType" AS ENUM ('job', 'project', 'volunteering');

-- CreateEnum
CREATE TYPE "BulletStatus" AS ENUM ('draft', 'ready', 'archived');

-- CreateTable
CREATE TABLE "Bullet" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceType" "BulletSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "BulletStatus" NOT NULL DEFAULT 'draft',
    "contextScore" DOUBLE PRECISION,
    "contextNote" TEXT,
    "actionScore" DOUBLE PRECISION,
    "actionNote" TEXT,
    "outcomeScore" DOUBLE PRECISION,
    "outcomeNote" TEXT,
    "clarityScore" DOUBLE PRECISION,
    "clarityNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bullet_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Bullet_text_not_blank" CHECK (length(btrim("text")) > 0),
    CONSTRAINT "Bullet_contextScore_range" CHECK ("contextScore" IS NULL OR "contextScore" BETWEEN 0 AND 1),
    CONSTRAINT "Bullet_actionScore_range" CHECK ("actionScore" IS NULL OR "actionScore" BETWEEN 0 AND 1),
    CONSTRAINT "Bullet_outcomeScore_range" CHECK ("outcomeScore" IS NULL OR "outcomeScore" BETWEEN 0 AND 1),
    CONSTRAINT "Bullet_clarityScore_range" CHECK ("clarityScore" IS NULL OR "clarityScore" BETWEEN 0 AND 1)
);

-- CreateIndex
CREATE INDEX "Bullet_uid_status_idx" ON "Bullet"("uid", "status");

-- CreateIndex
CREATE INDEX "Bullet_uid_sourceType_sourceId_idx" ON "Bullet"("uid", "sourceType", "sourceId");
