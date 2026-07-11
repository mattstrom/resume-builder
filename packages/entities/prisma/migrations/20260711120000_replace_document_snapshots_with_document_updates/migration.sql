-- CreateTable
CREATE TABLE "DocumentUpdate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "update" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentUpdate_pkey" PRIMARY KEY ("id")
);

-- Copy the existing append-only profile history unchanged.
INSERT INTO "DocumentUpdate" ("id", "name", "uid", "sequence", "update", "createdAt", "updatedAt")
SELECT "id", "name", "uid", "sequence", "update", "createdAt", "updatedAt"
FROM "ProfileUpdate";

-- Preserve each existing resume snapshot as the first entry in its document log.
INSERT INTO "DocumentUpdate" ("id", "name", "uid", "sequence", "update", "createdAt", "updatedAt")
SELECT "id", "name", "uid", 1, "update", "createdAt", "updatedAt"
FROM "ResumeDocument";

-- CreateIndex
CREATE INDEX "DocumentUpdate_name_uid_sequence_idx"
ON "DocumentUpdate"("name", "uid", "sequence" DESC);

-- CreateIndex
CREATE INDEX "DocumentUpdate_uid_idx" ON "DocumentUpdate"("uid");

-- DropTable
DROP TABLE "ProfileUpdate";

-- DropTable
DROP TABLE "ResumeDocument";
