-- CreateEnum
CREATE TYPE "ScanCategory" AS ENUM ('MOMENTUM', 'TREND', 'REVERSAL', 'BREAKOUT', 'VOLUME', 'VOLATILITY', 'FUNDAMENTAL', 'CUSTOM');

-- AlterTable
ALTER TABLE "saved_scans" ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "category" "ScanCategory" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "cloneCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clonedFromId" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "runCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "scan_ratings" (
    "id" TEXT NOT NULL,
    "savedScanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "triggerValue" DOUBLE PRECISION,
    "triggerPrice" DOUBLE PRECISION,
    "matchedSymbols" TEXT[],
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_ratings_savedScanId_idx" ON "scan_ratings"("savedScanId");

-- CreateIndex
CREATE INDEX "scan_ratings_userId_idx" ON "scan_ratings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "scan_ratings_savedScanId_userId_key" ON "scan_ratings"("savedScanId", "userId");

-- CreateIndex
CREATE INDEX "alert_history_alertId_idx" ON "alert_history"("alertId");

-- CreateIndex
CREATE INDEX "alert_history_triggeredAt_idx" ON "alert_history"("triggeredAt" DESC);

-- CreateIndex
CREATE INDEX "saved_scans_category_idx" ON "saved_scans"("category");

-- CreateIndex
CREATE INDEX "saved_scans_isFeatured_idx" ON "saved_scans"("isFeatured");

-- CreateIndex
CREATE INDEX "saved_scans_avgRating_idx" ON "saved_scans"("avgRating" DESC);

-- CreateIndex
CREATE INDEX "saved_scans_runCount_idx" ON "saved_scans"("runCount" DESC);

-- AddForeignKey
ALTER TABLE "saved_scans" ADD CONSTRAINT "saved_scans_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "saved_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_ratings" ADD CONSTRAINT "scan_ratings_savedScanId_fkey" FOREIGN KEY ("savedScanId") REFERENCES "saved_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
