-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "level" TEXT,
    "jobPostingUrl" TEXT NOT NULL DEFAULT '',
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "base" BOOLEAN NOT NULL DEFAULT false,
    "applicationId" TEXT,
    "sourceResumeId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "jobPostingUrl" TEXT NOT NULL DEFAULT '',
    "jobDescription" TEXT,
    "notionId" TEXT,
    "coverLetterId" TEXT,
    "jobSummary" JSONB,
    "analysis" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "jobPostingUrl" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInformation" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "phoneNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "linkedInProfile" TEXT NOT NULL DEFAULT '',
    "githubProfile" TEXT NOT NULL DEFAULT '',
    "personalWebsite" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInformation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resume_uid_idx" ON "Resume"("uid");

-- CreateIndex
CREATE INDEX "Resume_applicationId_idx" ON "Resume"("applicationId");

-- CreateIndex
CREATE INDEX "Resume_sourceResumeId_idx" ON "Resume"("sourceResumeId");

-- CreateIndex
CREATE INDEX "Application_uid_idx" ON "Application"("uid");

-- CreateIndex
CREATE INDEX "CoverLetter_uid_idx" ON "CoverLetter"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "ContactInformation_uid_key" ON "ContactInformation"("uid");

-- CreateIndex
CREATE INDEX "ContactInformation_uid_idx" ON "ContactInformation"("uid");

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_sourceResumeId_fkey" FOREIGN KEY ("sourceResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
