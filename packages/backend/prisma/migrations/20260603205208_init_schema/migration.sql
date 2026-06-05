-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "narrative" TEXT NOT NULL DEFAULT '',
    "narrativeSummary" JSONB,
    "jobPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "applicationId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "model" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fact" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "what" TEXT NOT NULL,
    "impact" TEXT,
    "scale" TEXT,
    "tags" TEXT[],
    "technologies" TEXT[],
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expression" (
    "id" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "length" TEXT,
    "tone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeFact" (
    "resumeId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "expressionId" TEXT,
    "section" TEXT,
    "position" INTEGER,

    CONSTRAINT "ResumeFact_pkey" PRIMARY KEY ("resumeId","factId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_uid_key" ON "Profile"("uid");

-- CreateIndex
CREATE INDEX "Profile_uid_idx" ON "Profile"("uid");

-- CreateIndex
CREATE INDEX "Conversation_uid_idx" ON "Conversation"("uid");

-- CreateIndex
CREATE INDEX "Conversation_applicationId_idx" ON "Conversation"("applicationId");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_idx" ON "ConversationMessage"("conversationId");

-- CreateIndex
CREATE INDEX "Fact_uid_idx" ON "Fact"("uid");

-- CreateIndex
CREATE INDEX "Fact_entityId_idx" ON "Fact"("entityId");

-- CreateIndex
CREATE INDEX "Expression_factId_idx" ON "Expression"("factId");

-- CreateIndex
CREATE INDEX "ResumeFact_resumeId_idx" ON "ResumeFact"("resumeId");

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expression" ADD CONSTRAINT "Expression_factId_fkey" FOREIGN KEY ("factId") REFERENCES "Fact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeFact" ADD CONSTRAINT "ResumeFact_factId_fkey" FOREIGN KEY ("factId") REFERENCES "Fact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeFact" ADD CONSTRAINT "ResumeFact_expressionId_fkey" FOREIGN KEY ("expressionId") REFERENCES "Expression"("id") ON DELETE SET NULL ON UPDATE CASCADE;
