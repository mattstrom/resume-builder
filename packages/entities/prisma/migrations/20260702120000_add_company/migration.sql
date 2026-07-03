-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('employer', 'recruiter', 'other');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('on_site', 'hybrid', 'remote');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "type" "CompanyType" NOT NULL DEFAULT 'employer',
    "website" TEXT NOT NULL DEFAULT '',
    "locationType" "LocationType" NOT NULL DEFAULT 'remote',
    "address" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_companyId_idx" ON "Application"("companyId");

-- CreateIndex
CREATE INDEX "Company_createdBy_idx" ON "Company"("createdBy");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
