-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('professional', 'personal');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT,
    "responsibilities" TEXT[],
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "degree" TEXT NOT NULL DEFAULT '',
    "field" TEXT NOT NULL DEFAULT '',
    "institution" TEXT NOT NULL DEFAULT '',
    "graduated" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "technologies" TEXT[],
    "items" TEXT[],
    "type" "ProjectType",
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGroup" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "items" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteering" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "organization" TEXT,
    "position" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT,
    "responsibilities" TEXT[],
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_uid_idx" ON "Job"("uid");

-- CreateIndex
CREATE INDEX "Education_uid_idx" ON "Education"("uid");

-- CreateIndex
CREATE INDEX "Project_uid_idx" ON "Project"("uid");

-- CreateIndex
CREATE INDEX "Skill_uid_idx" ON "Skill"("uid");

-- CreateIndex
CREATE INDEX "SkillGroup_uid_idx" ON "SkillGroup"("uid");

-- CreateIndex
CREATE INDEX "Volunteering_uid_idx" ON "Volunteering"("uid");
