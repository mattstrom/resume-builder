CREATE TYPE "Flow" AS ENUM (
    'jobDescriptionRetrieval',
    'jobConceptIdentification',
    'fitAssessment',
    'comparison',
    'conceptEvidenceEvaluation',
    'markupJobDescription',
    'backgroundAutofill',
    'bulletScoring',
    'bulletConceptAnnotation',
    'professionalStatementEvaluation',
    'narrativeDistillation',
    'careerContext',
    'factsExtraction'
);

CREATE TYPE "FlowSubject" AS ENUM (
    'application',
    'bullet',
    'job',
    'project',
    'skill',
    'volunteering',
    'professionalStatement',
    'profile'
);

CREATE TYPE "FlowRunStatus" AS ENUM (
    'running',
    'success',
    'failed',
    'suspended',
    'canceled'
);

CREATE TABLE "FlowRun" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "flow" "Flow" NOT NULL,
    "subjectType" "FlowSubject" NOT NULL,
    "subjectId" TEXT,
    "status" "FlowRunStatus" NOT NULL,
    "runId" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlowRun_uid_subjectType_subjectId_flow_key"
    ON "FlowRun"("uid", "subjectType", "subjectId", "flow");
CREATE INDEX "FlowRun_uid_status_idx"
    ON "FlowRun"("uid", "status");
CREATE INDEX "FlowRun_subjectType_subjectId_idx"
    ON "FlowRun"("subjectType", "subjectId");
