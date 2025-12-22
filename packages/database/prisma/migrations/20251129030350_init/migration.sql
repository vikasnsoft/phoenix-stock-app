-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FREE', 'PRO', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "Exchange" AS ENUM ('NYSE', 'NASDAQ', 'AMEX', 'OTC', 'LSE', 'TSX', 'OTHER');

-- CreateEnum
CREATE TYPE "Timeframe" AS ENUM ('MIN_1', 'MIN_5', 'MIN_15', 'MIN_30', 'HOUR_1', 'HOUR_4', 'DAY_1', 'WEEK_1', 'MONTH_1');

-- CreateEnum
CREATE TYPE "IndicatorType" AS ENUM ('SMA', 'EMA', 'RSI', 'MACD', 'BOLLINGER_BANDS', 'ATR', 'STOCHASTIC', 'ADX', 'OBV', 'VWAP');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PRICE_CROSS', 'INDICATOR_CROSS', 'SCAN_MATCH', 'PERCENT_CHANGE');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'TRIGGERED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BacktestStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FREE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "googleId" TEXT,
    "picture" TEXT,
    "apiCallsToday" INTEGER NOT NULL DEFAULT 0,
    "lastApiReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symbols" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" "Exchange" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sector" TEXT,
    "industry" TEXT,
    "marketCap" BIGINT,
    "description" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ipo" TIMESTAMP(3),
    "delistDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "symbols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candles" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" "Timeframe" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(20,8) NOT NULL,
    "high" DECIMAL(20,8) NOT NULL,
    "low" DECIMAL(20,8) NOT NULL,
    "close" DECIMAL(20,8) NOT NULL,
    "volume" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_cache" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "indicator" "IndicatorType" NOT NULL,
    "timeframe" "Timeframe" NOT NULL,
    "period" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicator_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_symbols" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_symbols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_scans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "symbolUniverse" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "saved_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "condition" JSONB NOT NULL,
    "ticker" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailNotify" BOOLEAN NOT NULL DEFAULT true,
    "pushNotify" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "triggeredAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedScanId" TEXT,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timeframe" "Timeframe" NOT NULL,
    "definition" JSONB NOT NULL,
    "status" "BacktestStatus" NOT NULL DEFAULT 'PENDING',
    "results" JSONB,
    "totalMatches" INTEGER,
    "avgReturn" DECIMAL(10,4),
    "winRate" DECIMAL(5,2),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "backtests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "symbols_ticker_key" ON "symbols"("ticker");

-- CreateIndex
CREATE INDEX "symbols_ticker_idx" ON "symbols"("ticker");

-- CreateIndex
CREATE INDEX "symbols_exchange_idx" ON "symbols"("exchange");

-- CreateIndex
CREATE INDEX "symbols_sector_idx" ON "symbols"("sector");

-- CreateIndex
CREATE INDEX "symbols_isActive_idx" ON "symbols"("isActive");

-- CreateIndex
CREATE INDEX "candles_symbolId_timeframe_timestamp_idx" ON "candles"("symbolId", "timeframe", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "candles_timestamp_idx" ON "candles"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "candles_symbolId_timeframe_timestamp_key" ON "candles"("symbolId", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "indicator_cache_symbolId_indicator_timeframe_idx" ON "indicator_cache"("symbolId", "indicator", "timeframe");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_cache_symbolId_indicator_timeframe_period_timesta_key" ON "indicator_cache"("symbolId", "indicator", "timeframe", "period", "timestamp");

-- CreateIndex
CREATE INDEX "watchlists_userId_idx" ON "watchlists"("userId");

-- CreateIndex
CREATE INDEX "watchlist_symbols_watchlistId_idx" ON "watchlist_symbols"("watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_symbols_watchlistId_symbolId_key" ON "watchlist_symbols"("watchlistId", "symbolId");

-- CreateIndex
CREATE INDEX "saved_scans_userId_idx" ON "saved_scans"("userId");

-- CreateIndex
CREATE INDEX "saved_scans_isPublic_idx" ON "saved_scans"("isPublic");

-- CreateIndex
CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_ticker_idx" ON "alerts"("ticker");

-- CreateIndex
CREATE INDEX "backtests_userId_idx" ON "backtests"("userId");

-- CreateIndex
CREATE INDEX "backtests_status_idx" ON "backtests"("status");

-- AddForeignKey
ALTER TABLE "candles" ADD CONSTRAINT "candles_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_cache" ADD CONSTRAINT "indicator_cache_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_symbols" ADD CONSTRAINT "watchlist_symbols_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_symbols" ADD CONSTRAINT "watchlist_symbols_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_scans" ADD CONSTRAINT "saved_scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtests" ADD CONSTRAINT "backtests_savedScanId_fkey" FOREIGN KEY ("savedScanId") REFERENCES "saved_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
