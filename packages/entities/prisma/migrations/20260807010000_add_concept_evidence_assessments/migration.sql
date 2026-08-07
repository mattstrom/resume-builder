CREATE TABLE "ConceptEvidenceAssessment" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "evaluatorVersion" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptEvidenceAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConceptEvidenceAssessment_uid_applicationId_resumeId_key"
    ON "ConceptEvidenceAssessment"("uid", "applicationId", "resumeId");
CREATE INDEX "ConceptEvidenceAssessment_applicationId_idx"
    ON "ConceptEvidenceAssessment"("applicationId");
CREATE INDEX "ConceptEvidenceAssessment_resumeId_idx"
    ON "ConceptEvidenceAssessment"("resumeId");

ALTER TABLE "ConceptEvidenceAssessment"
    ADD CONSTRAINT "ConceptEvidenceAssessment_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptEvidenceAssessment"
    ADD CONSTRAINT "ConceptEvidenceAssessment_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "Resume"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
