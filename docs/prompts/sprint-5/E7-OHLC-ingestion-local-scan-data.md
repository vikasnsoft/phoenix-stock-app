# E7: OHLC Ingestion & Local Scan Data

**Epic**: Ingestion & Local Scan Data Store  
**Sprint**: 5 (proposed)  
**Status**: Planned  
**Priority**: P0 (Critical for scale & reliability)

## Goal

Move the screener off live Finnhub candles for scan execution by:

- Ingesting OHLCV data via workers into a local store (Postgres via Prisma and/or Redis)
- Running all scan filters against this local data (EOD first, intraday later)
- Keeping Finnhub only as an upstream data source, not the execution-time dependency

## Context

- Current scans call Finnhub on-demand via `GET /api/market-data/candles` (Nest) and `FinnhubDataProvider` (MCP).
- This causes:
  - Latency and rate-limit risks during scans
  - Transient errors like "No data available" when upstream fails
  - Difficulty running backtests and consistent replays
- You already have:
  - `FinnhubService` with `getCandles`
  - `QueuesModule` / `IngestionModule` / `DatabaseModule`
  - MCP scan engine that can work over any OHLCV DataFrame

This epic formalizes a local OHLC pipeline and switches scans to use it.

## High-Level Phases

1. **Schema & Storage** – Decide where OHLCV lives (Prisma model + optional Redis cache)
2. **Ingestion Workers** – Fetch from Finnhub into local store (EOD first)
3. **Provider Switch** – Change MCP `FinnhubDataProvider` to read from local store instead of Finnhub HTTP
4. **Backfill & Scheduling** – CLI/cron for historical backfill + daily updates
5. **Validation & Metrics** – Sanity checks vs direct Finnhub and basic monitoring

---

## Technical Requirements

### 1. Define OHLCV Storage Schema

**File**: `apps/api/prisma/schema.prisma`

Add a `Candle` model (or `PriceCandle`) optimized for EOD scans:

```prisma
model Candle {
  id        String   @id @default(uuid())
  symbol    String
  date      DateTime  // EOD date (no time), UTC
  open      Float
  high      Float
  low       Float
  close     Float
  volume    Float?

  timeframe String   // e.g. "D", "60", "15" (Finnhub-style resolution)
  source    String   // e.g. "finnhub"

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([symbol, timeframe, date])
  @@map("candles")
}
```

Then run migration:

```bash
cd apps/api
npx prisma migrate dev --name add_candles_table
npx prisma generate
```

(Optionally add a small Redis cache keyed by `candle:{symbol}:{timeframe}` later.)

### 2. Add Ingestion Service & Worker

**Files**:

- `apps/api/src/modules/ingestion/ohlc-ingestion.service.ts` (new)
- `apps/api/src/modules/ingestion/ingestion.module.ts` (already exists, extend)

Responsibilities:

- Fetch candles for `(symbol, timeframe, from, to)` via `FinnhubService.getCandles`.
- Upsert into `Candle` table with idempotent logic.
- Orchestrate per-exchange / per-symbol ingestion.

Pseudo-skeleton:

```ts
@Injectable()
export class OhlcIngestionService {
  private readonly logger = new Logger(OhlcIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhub: FinnhubService
  ) {}

  async ingestSymbolRange(params: {
    symbol: string;
    resolution: string; // e.g. 'D'
    from: number;
    to: number;
    source?: string;
  }): Promise<{ inserted: number; updated: number }> {
    const { symbol, resolution, from, to, source = "finnhub" } = params;

    const candles = await this.finnhub.getCandles(symbol, resolution, from, to);

    if (!candles || candles.s !== "ok") {
      this.logger.warn(
        `No candles for ${symbol} (${resolution}) status=${candles?.s}`
      );
      return { inserted: 0, updated: 0 };
    }

    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < candles.t.length; i++) {
      const ts = candles.t[i];
      const date = new Date(ts * 1000);
      const open = candles.o[i];
      const high = candles.h[i];
      const low = candles.l[i];
      const close = candles.c[i];
      const volume = candles.v[i];

      const result = await this.prisma.candle.upsert({
        where: {
          symbol_timeframe_date: {
            symbol,
            timeframe: resolution,
            date,
          },
        },
        update: {
          open,
          high,
          low,
          close,
          volume,
          source,
        },
        create: {
          symbol,
          timeframe: resolution,
          date,
          open,
          high,
          low,
          close,
          volume,
          source,
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    this.logger.log(
      `Ingested ${inserted} new, ${updated} updated candles for ${symbol} (${resolution})`
    );
    return { inserted, updated };
  }
}
```

Update `schema.prisma` accordingly with a composite unique key:

```prisma
@@unique([symbol, timeframe, date], name: "symbol_timeframe_date")
```

And add the corresponding `@@id` mapping to match the `upsert` where clause.

### 3. Add Simple Ingestion CLI Endpoint / Job

**File**: `apps/api/src/modules/ingestion/ingestion.controller.ts` (new)

Expose a simple admin-only endpoint for dev/testing:

```ts
@ApiTags("Ingestion")
@Controller("ingestion")
export class IngestionController {
  constructor(private readonly ohlcIngestion: OhlcIngestionService) {}

  @Post("backfill")
  async backfill(
    @Body()
    body: {
      symbol: string;
      resolution?: string;
      from: number;
      to: number;
    }
  ) {
    const { symbol, resolution = "D", from, to } = body;
    const result = await this.ohlcIngestion.ingestSymbolRange({
      symbol,
      resolution,
      from,
      to,
    });
    return createSuccessResponse(result);
  }
}
```

Later, wire this to a queue worker (BullMQ) and cron jobs, but start with a simple manual trigger.

### 4. Implement Local Candle Reader for MCP

**File**: `apps/api/src/modules/market-data/market-data.controller.ts`

Add a new endpoint that **reads from DB instead of Finnhub**:

```ts
@Get('candles/local')
async getLocalCandles(
  @Query('symbol') symbol: string,
  @Query('resolution') resolution: string,
  @Query('from') from: number,
  @Query('to') to: number,
): Promise<{ c: number[]; h: number[]; l: number[]; o: number[]; v: number[]; t: number[]; s: string }> {
  // Read from Prisma.candle where date between from/to, symbol+timeframe match
}
```

**File**: `apps/mcp-server/server.py`

- Add a configuration flag to choose between **live** vs **local** candles:

```python
USE_LOCAL_CANDLES = os.getenv("USE_LOCAL_CANDLES", "false").lower() == "true"
```

- In `FinnhubDataProvider.fetch_ohlc`, branch on this flag:

```python
endpoint = '/api/market-data/candles/local' if USE_LOCAL_CANDLES else '/api/market-data/candles'
raw_data = _api_request('GET', endpoint, params)
```

This lets you:

- Ingest candles once via workers
- Flip `USE_LOCAL_CANDLES=true` in MCP env to run scans entirely on local OHLC

### 5. Scheduler / Worker Integration (Phase 2 of Epic)

**Files**:

- `apps/api/src/modules/queues/queues.module.ts`
- `apps/api/src/modules/ingestion/ohlc-ingestion.processor.ts` (BullMQ worker)

Stories for this phase:

- Add a BullMQ job type `IngestCandlesJob` with payload `{ symbol, resolution, from, to }`.
- Nightly cron:
  - For each symbol in universe (from `SymbolsModule`), enqueue EOD ingestion for yesterday.
- Optional: Intraday ingestion job for `resolution=60` or `15` with smaller ranges.

---

## Acceptance Criteria

- [ ] `Candle` table exists and migrations applied
- [ ] `OhlcIngestionService.ingestSymbolRange` can ingest AAPL daily candles for a given range
- [ ] `POST /api/ingestion/backfill` triggers ingestion and returns counts
- [ ] `GET /api/market-data/candles/local` returns Finnhub-like JSON from DB
- [ ] `USE_LOCAL_CANDLES=true` causes MCP scans to use local candles only
- [ ] A simple scan (e.g. `close > 100`) returns consistent results using local data

## Testing Steps

1. **Migrate DB**

```bash
cd apps/api
npx prisma migrate dev --name add_candles_table
npx prisma generate
```

2. **Backfill AAPL EOD candles (manual)**

```bash
cd apps/api
npm run start:dev

# In another terminal
curl -X POST http://localhost:4001/api/ingestion/backfill \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "resolution": "D",
    "from": 1700000000,
    "to": 1730000000
  }'
```

3. **Verify local candles endpoint**

```bash
curl "http://localhost:4001/api/market-data/candles/local?symbol=AAPL&resolution=D&from=1700000000&to=1730000000"
```

Expected: JSON with `s: "ok"` and arrays `c,h,l,o,v,t` from DB.

4. **Switch MCP to local mode**

- In `apps/mcp-server/.env`:

```env
USE_LOCAL_CANDLES=true
```

- Restart MCP (or just run via Nest path).

5. **Run a scan using expression filter**

Same curl as before for `/api/scans/run` with `symbols: ["AAPL"]` and expression filter.

Expected:

- No `"No data available"` for AAPL
- `matched_stocks` depends only on your condition and ingested data

---

## Dependencies

- Finnhub API key configured and working in `apps/api/.env`
- Database reachable and migrations up to date
- Basic queues/ingestion module already present (you extend it)

---

## Next Steps After This Epic

- Add intraday ingestion (60m / 15m) for high‑frequency scans
- Add retention policy (prune old intraday candles)
- Add metrics dashboards for ingestion lag and data freshness
- Extend backtesting to use the same `Candle` table (no separate data source)
