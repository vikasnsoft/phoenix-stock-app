# E7-S1: Candle Schema, Ingestion Service & Manual Backfill

**Epic**: E7 – OHLC Ingestion & Local Scan Data  
**Sprint**: 5  
**Status**: Planned  
**Priority**: P0 (Foundation for local scan data)

## Goal

Create a persistent OHLCV store in Postgres and implement a first ingestion path from Finnhub → Nest → Prisma, plus a simple admin endpoint to manually backfill candles for a given symbol and date range.

This story does **not** yet switch MCP to local data; it only prepares the data store and ingestion path.

## Context

- Finnhub access is already implemented in `FinnhubService.getCandles`.
- Scans currently call live Finnhub through `GET /api/market-data/candles`.
- We want to:
  - Persist EOD candles locally (`Candle` model).
  - Provide `OhlcIngestionService` for reusable ingestion logic.
  - Create a simple `/api/ingestion/backfill` endpoint to trigger ingestion for symbols.

Follow-up stories (E7-S2, E7-S3) will:

- Add a local candles endpoint used by MCP.
- Add queues/cron for automated daily ingestion.

---

## Technical Requirements

### 1. Add Candle Model to Prisma Schema

**File**: `apps/api/prisma/schema.prisma`

Add a new model for OHLCV candles, optimized for EOD (and later intraday) scans.

**Requirements**:

- Fields:

  - `id: String @id @default(uuid())`
  - `symbol: String` (e.g. `AAPL`, `RELIANCE.NS`)
  - `date: DateTime` (EOD date; treat as UTC)
  - `open: Float`
  - `high: Float`
  - `low: Float`
  - `close: Float`
  - `volume: Float?`
  - `timeframe: String` (Finnhub-style resolution: `D`, `60`, `15`, etc.)
  - `source: String` (e.g. `"finnhub"`)
  - `createdAt: DateTime @default(now())`
  - `updatedAt: DateTime @updatedAt`

- Constraints:

  - Unique per `(symbol, timeframe, date)` for idempotent upserts:
    ```prisma
    @@unique([symbol, timeframe, date], name: "symbol_timeframe_date")
    @@map("candles")
    ```

- Run migration:

  ```bash
  cd apps/api
  npx prisma migrate dev --name add_candles_table
  npx prisma generate
  ```

### 2. Implement OhlcIngestionService

**File**: `apps/api/src/modules/ingestion/ohlc-ingestion.service.ts` (new)

**Dependencies**:

- `PrismaService` from `DatabaseModule`
- `FinnhubService` from `MarketDataModule`

**Responsibilities**:

- Method `ingestSymbolRange` with signature similar to:

  ```ts
  ingestSymbolRange(params: {
    symbol: string;
    resolution: string; // e.g. 'D'
    from: number;       // unix seconds
    to: number;         // unix seconds
    source?: string;    // default 'finnhub'
  }): Promise<{ inserted: number; updated: number }>
  ```

- Behavior:
  - Call `this.finnhub.getCandles(symbol, resolution, from, to)`.
  - If `data.s !== 'ok'`:
    - Log `warn` with symbol, resolution, `data.s`.
    - Return `{ inserted: 0, updated: 0 }`.
  - Else, for each index `i`:
    - Convert `t[i]` (seconds) to JS `Date`.
    - Upsert via Prisma:
      - `where: { symbol_timeframe_date: { symbol, timeframe: resolution, date } }`
      - `create` and `update` with OHLCV + `source`.
  - Count how many rows were created vs updated and return that.

**Implementation hints**:

- Use a small helper to map Finnhub candle arrays (`c,h,l,o,v,t`) into a loop.
- Consider batching with `prisma.$transaction` if needed; for now, simple sequential upserts are acceptable for MVP.
- Use `Logger` with context `OhlcIngestionService`.

### 3. Wire Ingestion Module

**File**: `apps/api/src/modules/ingestion/ingestion.module.ts`

- Ensure the module:
  - Imports `DatabaseModule` and `MarketDataModule`.
  - Provides and exports `OhlcIngestionService`.

Example structure (adapt to your existing module file):

```ts
@Module({
  imports: [DatabaseModule, MarketDataModule],
  providers: [OhlcIngestionService],
  exports: [OhlcIngestionService],
})
export class IngestionModule {}
```

Verify that `IngestionModule` is already imported in `AppModule` (it is in current code; keep as-is).

### 4. Add Manual Backfill Endpoint

**File**: `apps/api/src/modules/ingestion/ingestion.controller.ts` (new)

Expose an admin-only style endpoint for now (no auth wiring needed yet, but keep design simple to secure later).

**Endpoint**: `POST /api/ingestion/backfill`

- Request body (JSON):

  ```json
  {
    "symbol": "AAPL",
    "resolution": "D",
    "from": 1700000000,
    "to": 1730000000
  }
  ```

- Behavior:
  - Validate minimal shape (string symbol, numeric from/to; resolution optional with default `D`).
  - Call `ohlcIngestionService.ingestSymbolRange({ symbol, resolution, from, to })`.
  - Return success wrapper consistent with your existing pattern (e.g. `createSuccessResponse`).

**File**: `apps/api/src/modules/ingestion/ingestion.module.ts`

- Add `IngestionController` to `controllers` array.

### 5. (Optional) Swagger Docs

- Tag controller with `@ApiTags('Ingestion')`.
- Add `@ApiOperation` and basic `@ApiBody`/`@ApiResponse` annotations.
- This makes backfill discoverable in your existing Swagger UI at `/api`.

---

## Files to Create/Modify

- **Modify**: `apps/api/prisma/schema.prisma` (add `Candle` model)
- **Create**: `apps/api/src/modules/ingestion/ohlc-ingestion.service.ts`
- **Modify**: `apps/api/src/modules/ingestion/ingestion.module.ts` (add service + controller)
- **Create**: `apps/api/src/modules/ingestion/ingestion.controller.ts`

---

## Acceptance Criteria

- [ ] `Candle` model exists and Prisma migrations apply successfully.
- [ ] `OhlcIngestionService.ingestSymbolRange`:
  - [ ] Logs a warning and returns `{ inserted: 0, updated: 0 }` when Finnhub returns `s !== 'ok'`.
  - [ ] Correctly upserts candles when `s === 'ok'`.
- [ ] `POST /api/ingestion/backfill`:
  - [ ] Validates request payload minimally.
  - [ ] Triggers ingestion and returns `{ inserted, updated }` in the response body.
- [ ] No breaking changes to existing `MarketDataModule` or scans.

---

## Testing Steps

1. **Run Prisma migration**

```bash
cd apps/api
npx prisma migrate dev --name add_candles_table
npx prisma generate
```

2. **Start API**

```bash
cd apps/api
npm run start:dev
```

3. **Trigger Backfill for AAPL (daily)**

Choose a reasonable time range (e.g. last ~1 year):

```bash
# Example: roughly Nov 2023 to Nov 2024 (timestamps are illustrative)
FROM=1698796800
TO=1730332800

curl -X POST http://localhost:4001/api/ingestion/backfill \
  -H "Content-Type: application/json" \
  -d "{\"symbol\":\"AAPL\",\"resolution\":\"D\",\"from\":$FROM,\"to\":$TO}"
```

Expected response (shape, not exact numbers):

```json
{
  "data": {
    "inserted": 250,
    "updated": 0
  },
  "error": null
}
```

4. **Verify Data in DB (optional)**

Use Prisma Studio or psql:

```bash
cd apps/api
npx prisma studio
```

- Open `Candle` table.
- Filter by `symbol = "AAPL"` and `timeframe = "D"`.
- Confirm rows exist with realistic OHLC/volume values.

5. **Error-Path Check**

- Temporarily set a bad `FINNHUB_API_KEY` or use an invalid symbol.
- Call `/api/ingestion/backfill` again.
- Confirm:
  - Response `{ inserted: 0, updated: 0 }`.
  - Logs show a clear warning about Finnhub status or error.

---

## Dependencies

- `FINNHUB_API_KEY` configured and valid in `apps/api/.env`.
- Database reachable and migrations up to date.
- `DatabaseModule` and `MarketDataModule` already working.

---

## Next Stories in Epic

- **E7-S2**: Implement `GET /api/market-data/candles/local` + MCP `USE_LOCAL_CANDLES` switch.
- **E7-S3**: Add scheduler and queues (BullMQ) for daily EOD ingestion for the full symbol universe.
