-- CreateTable
CREATE TABLE "financial_metrics" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "metric" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_status" (
    "key" TEXT NOT NULL,
    "lastRun" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_status_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "financial_metrics_symbolId_fetchedAt_idx" ON "financial_metrics"("symbolId", "fetchedAt" DESC);

-- AddForeignKey
ALTER TABLE "financial_metrics" ADD CONSTRAINT "financial_metrics_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
