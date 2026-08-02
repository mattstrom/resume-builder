-- CreateTable
CREATE TABLE "BulletConcept" (
    "bulletId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletConcept_pkey" PRIMARY KEY ("bulletId", "conceptId", "relation")
);

-- CreateIndex
CREATE INDEX "BulletConcept_conceptId_relation_idx" ON "BulletConcept"("conceptId", "relation");

-- AddForeignKey
ALTER TABLE "BulletConcept" ADD CONSTRAINT "BulletConcept_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "Bullet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletConcept" ADD CONSTRAINT "BulletConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
