CREATE TABLE "SearchResultFeedback" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "searchRunId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "resultType" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "agentScore" DOUBLE PRECISION NOT NULL,
    "relevant" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchResultFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchResultFeedback_uid_searchRunId_resultId_key"
    ON "SearchResultFeedback"("uid", "searchRunId", "resultId");
CREATE INDEX "SearchResultFeedback_uid_createdAt_idx"
    ON "SearchResultFeedback"("uid", "createdAt");
CREATE INDEX "SearchResultFeedback_searchRunId_idx"
    ON "SearchResultFeedback"("searchRunId");
