-- CreateTable
CREATE TABLE "JobRequirementFact" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "technologies" TEXT[],
    "tags" TEXT[],
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRequirementFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRequirementFact_uid_idx" ON "JobRequirementFact"("uid");

-- CreateIndex
CREATE INDEX "JobRequirementFact_applicationId_idx" ON "JobRequirementFact"("applicationId");
