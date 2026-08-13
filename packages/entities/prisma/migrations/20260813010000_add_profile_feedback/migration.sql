CREATE TABLE "RequirementGradeFeedback" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "jobRequirementId" TEXT NOT NULL,
    "agentGrade" TEXT NOT NULL,
    "manualGrade" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementGradeFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileKnowledgeProposal" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "acceptedFactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ProfileKnowledgeProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RequirementGradeFeedback_uid_applicationId_createdAt_idx"
    ON "RequirementGradeFeedback"("uid", "applicationId", "createdAt");
CREATE INDEX "RequirementGradeFeedback_jobRequirementId_createdAt_idx"
    ON "RequirementGradeFeedback"("jobRequirementId", "createdAt");
CREATE INDEX "ProfileKnowledgeProposal_uid_status_idx"
    ON "ProfileKnowledgeProposal"("uid", "status");
CREATE INDEX "ProfileKnowledgeProposal_feedbackId_idx"
    ON "ProfileKnowledgeProposal"("feedbackId");

ALTER TABLE "RequirementGradeFeedback"
    ADD CONSTRAINT "RequirementGradeFeedback_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementGradeFeedback"
    ADD CONSTRAINT "RequirementGradeFeedback_jobRequirementId_fkey"
    FOREIGN KEY ("jobRequirementId") REFERENCES "JobRequirementFact"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileKnowledgeProposal"
    ADD CONSTRAINT "ProfileKnowledgeProposal_feedbackId_fkey"
    FOREIGN KEY ("feedbackId") REFERENCES "RequirementGradeFeedback"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileKnowledgeProposal"
    ADD CONSTRAINT "ProfileKnowledgeProposal_acceptedFactId_fkey"
    FOREIGN KEY ("acceptedFactId") REFERENCES "Fact"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
