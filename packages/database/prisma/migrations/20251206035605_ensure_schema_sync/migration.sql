-- CreateTable
CREATE TABLE "saved_scan_versions" (
    "id" TEXT NOT NULL,
    "savedScanId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "comment" TEXT,

    CONSTRAINT "saved_scan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_scan_versions_savedScanId_idx" ON "saved_scan_versions"("savedScanId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_scan_versions_savedScanId_versionNumber_key" ON "saved_scan_versions"("savedScanId", "versionNumber");

-- AddForeignKey
ALTER TABLE "saved_scan_versions" ADD CONSTRAINT "saved_scan_versions_savedScanId_fkey" FOREIGN KEY ("savedScanId") REFERENCES "saved_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
