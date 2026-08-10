-- CreateTable
CREATE TABLE "SkillConcept" (
    "skillId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ontology',
    "confidence" DOUBLE PRECISION,
    "qualifier" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillConcept_pkey" PRIMARY KEY ("skillId", "conceptId", "relation")
);

-- CreateTable
CREATE TABLE "ProjectConcept" (
    "projectId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ontology',
    "confidence" DOUBLE PRECISION,
    "qualifier" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectConcept_pkey" PRIMARY KEY ("projectId", "conceptId", "relation")
);

-- CreateIndex
CREATE INDEX "SkillConcept_conceptId_relation_idx" ON "SkillConcept"("conceptId", "relation");

-- CreateIndex
CREATE INDEX "ProjectConcept_conceptId_relation_idx" ON "ProjectConcept"("conceptId", "relation");

-- AddForeignKey
ALTER TABLE "SkillConcept" ADD CONSTRAINT "SkillConcept_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillConcept" ADD CONSTRAINT "SkillConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectConcept" ADD CONSTRAINT "ProjectConcept_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectConcept" ADD CONSTRAINT "ProjectConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
