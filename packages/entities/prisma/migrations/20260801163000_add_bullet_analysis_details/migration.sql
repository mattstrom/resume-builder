ALTER TABLE "Bullet"
ADD COLUMN "contextWhatWorksWell" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "contextWhyItMatters" TEXT,
ADD COLUMN "contextProposedEnhancements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "actionWhatWorksWell" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "actionWhyItMatters" TEXT,
ADD COLUMN "actionProposedEnhancements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "outcomeWhatWorksWell" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "outcomeWhyItMatters" TEXT,
ADD COLUMN "outcomeProposedEnhancements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "clarityWhatWorksWell" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "clarityWhyItMatters" TEXT,
ADD COLUMN "clarityProposedEnhancements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
