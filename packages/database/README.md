# Database Package

Shared database layer using Prisma ORM with PostgreSQL and TimescaleDB for the Stock Scanner application.

## Setup

### 1. Install PostgreSQL with TimescaleDB

**macOS (using Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL
brew services start postgresql@16

# Install TimescaleDB
brew tap timescale/tap
brew install timescaledb

# Setup TimescaleDB
timescaledb-tune --quiet --yes

# Restart PostgreSQL
brew services restart postgresql@16
```

**Docker (Alternative):**
```bash
docker run -d --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  timescale/timescaledb:latest-pg16
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE stock_scanner;

# Connect to the database
\c stock_scanner

# Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Exit
\q
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and update DATABASE_URL
# DATABASE_URL="postgresql://postgres:password@localhost:5432/stock_scanner?schema=public"
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Generate Prisma Client

```bash
npm run db:generate
```

### 6. Run Migrations

```bash
npm run db:migrate
```

### 7. Convert Candles Table to Hypertable (TimescaleDB)

After running migrations, convert the candles table to a TimescaleDB hypertable:

```sql
-- Connect to database
psql postgresql://postgres:password@localhost:5432/stock_scanner

-- Create hypertable (time-series optimization)
SELECT create_hypertable('candles', 'timestamp', 
  chunk_time_interval => INTERVAL '1 month',
  if_not_exists => TRUE
);

-- Create retention policy (optional - keep 2 years of data)
SELECT add_retention_policy('candles', INTERVAL '2 years', if_not_exists => TRUE);

-- Create compression policy (optional - compress data older than 7 days)
ALTER TABLE candles SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol_id,timeframe'
);

SELECT add_compression_policy('candles', INTERVAL '7 days', if_not_exists => TRUE);
```

## Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run migrations in development
- `npm run db:migrate:prod` - Deploy migrations to production
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Run seed script
- `npm run db:reset` - Reset database (⚠️ deletes all data)
- `npm run build` - Build TypeScript

## Usage

```typescript
import { prisma, connectDatabase } from '@stock-scanner/database';

// Connect
await connectDatabase();

// Query
const symbols = await prisma.symbol.findMany({
  where: { isActive: true },
  take: 10
});

// Create
const watchlist = await prisma.watchlist.create({
  data: {
    userId: 'user-id',
    name: 'Tech Stocks',
    symbols: {
      create: [
        { symbolId: 'symbol-id-1' },
        { symbolId: 'symbol-id-2' }
      ]
    }
  }
});

// Transaction
import { withTransaction } from '@stock-scanner/database';

await withTransaction(async (tx) => {
  await tx.user.update({ ... });
  await tx.watchlist.create({ ... });
});
```

## Schema Overview

### Core Entities

- **User** - User accounts with roles (FREE, PRO, ADMIN)
- **Symbol** - Stock/security master data with exchange, sector, industry
- **Candle** - OHLCV time-series data (optimized with TimescaleDB)
- **IndicatorCache** - Pre-computed technical indicators
- **Watchlist** - User-created stock watchlists
- **SavedScan** - Saved screener definitions
- **Alert** - Price/indicator alerts with notifications
- **Backtest** - Historical backtest results

### Indexes

The schema includes optimized indexes for:
- Fast symbol lookups by ticker
- Efficient time-series queries on candles
- User-specific resource filtering
- Alert status and expiration checks

## Migration from JSON Files

See migration scripts in `scripts/` directory:

```bash
# Run migration scripts after database is set up
ts-node scripts/migrate-symbols.ts
ts-node scripts/migrate-watchlists.ts
ts-node scripts/migrate-scans.ts
```

## Performance Tips

1. **Use TimescaleDB hypertables** for candles table
2. **Enable compression** for historical data
3. **Add retention policies** to auto-delete old data
4. **Use connection pooling** in production
5. **Batch inserts** for bulk data ingestion

## Prisma Studio

Open a visual database browser:

```bash
npm run db:studio
```

Navigate to http://localhost:5555
