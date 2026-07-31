-- The XML sidecar keeps native PostgreSQL XML query support without making
-- ordinary Resume CRUD depend on an unsupported Prisma scalar.
CREATE TABLE "ResumeXml" (
    "resumeId" TEXT NOT NULL,
    "content" XML NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeXml_pkey" PRIMARY KEY ("resumeId")
);

ALTER TABLE "ResumeXml"
ADD CONSTRAINT "ResumeXml_resumeId_fkey"
FOREIGN KEY ("resumeId") REFERENCES "Resume"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
