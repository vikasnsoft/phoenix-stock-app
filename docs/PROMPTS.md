# Stock Scanner - Ready-to-Paste Prompts

> Copy and paste these prompts to quickly start implementation tasks.

---

## Phase 1: Core Infrastructure

### 1.1 Authentication System

```
Implement JWT authentication for the NestJS API.

Reference files:
- @docs/IMPLEMENTATION_PLAN.md (Section 1.1)
- @apps/api/.cursorrules

Create the following structure:
apps/api/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/login.dto.ts
├── dto/register.dto.ts
├── strategies/jwt.strategy.ts
├── guards/jwt-auth.guard.ts
├── guards/roles.guard.ts
└── decorators/current-user.decorator.ts

Requirements:
1. Install: @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
2. JWT with 7d expiry, secret from JWT_SECRET env
3. Endpoints: POST /auth/login, POST /auth/register, GET /auth/me
4. Use bcrypt for password hashing
5. Include user role in JWT payload
6. Add proper DTOs with class-validator

Update @apps/api/src/app.module.ts to import AuthModule.
Add JWT_SECRET to .env.example.
```

---

### 1.2 Rate Limiting

```
Add rate limiting to the NestJS API.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 1.2)

Steps:
1. Install @nestjs/throttler
2. Configure in AppModule with tiers:
   - short: 3 req/sec
   - medium: 60 req/min
   - long: 1000 req/hour
3. Add global ThrottlerGuard
4. Add @SkipThrottle() to health check endpoints

Update @apps/api/src/app.module.ts with ThrottlerModule config.
```

---

### 1.3 Discovery Schema Updates

```
Update Prisma schema for discovery features.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 1.3)
File: @packages/database/prisma/schema.prisma

Add to SavedScan model:
- category (ScanCategory enum, optional)
- tags (String[])
- runCount (Int, default 0)
- cloneCount (Int, default 0)
- avgRating (Decimal(3,2), optional)
- isFeatured (Boolean, default false)
- clonedFromId (String, optional, self-relation)

Create new enum ScanCategory:
BREAKOUT, REVERSAL, MOMENTUM, VOLUME, CANDLESTICK, FUNDAMENTAL, CUSTOM

Create new model ScanRating:
- id, userId, savedScanId, rating (1-5), createdAt
- unique constraint on [userId, savedScanId]

Create new model AlertHistory:
- id, alertId, triggeredAt, matchCount, matchedSymbols[], notificationSent

After editing, run: npx prisma migrate dev --name add_discovery_fields
```

---

### 1.4 Dashboard Home Page

```
Create a functional dashboard home page for the web app.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 1.4)
Rules: @apps/web/.cursorrules

Replace @apps/web/src/app/page.tsx with a dashboard containing:

1. RecentScansWidget - Last 5 scan runs with "Run Again" button
2. WatchlistSummaryWidget - Count of watchlists, total symbols
3. AlertsWidget - Active alerts count, recent triggers
4. QuickActionsGrid - Cards linking to: Scan Builder, Saved Scans, Alerts, Watchlists

Use:
- TanStack Query for data fetching
- shadcn/ui components (Card, Button, Badge)
- Loading skeletons for each widget
- Tailwind for styling

Create components in @apps/web/src/app/(dashboard)/_components/
```

---

## Phase 2: Alerts & Notifications

### 2.1 Alert Evaluation Worker

```
Implement production-ready alert evaluation worker.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 2.1)
File: @apps/api/src/modules/alerts/workers/alert-evaluation.worker.ts

Implement evaluation methods:
1. evaluatePriceCross(condition) - Price crossed threshold
2. evaluateIndicatorCross(condition) - Indicator crossover (RSI, MACD, etc.)
3. evaluateScanMatch(condition) - Run saved scan, check if symbol matches
4. evaluatePercentChange(condition) - % change from previous close

Implement triggerAlert(alert):
1. Update alert status to TRIGGERED
2. Create AlertHistory record
3. Send notification (email if enabled)

Use MarketDataService to fetch current prices from Finnhub.
Schedule to run every 5 minutes during market hours.
```

---

### 2.2 Alert History Tracking

```
Add alert history tracking functionality.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 2.2)

1. Create methods in AlertsService:
   - createHistory(alertId, matchCount, matchedSymbols)
   - getAlertHistory(alertId, pagination)
   - getRecentTriggers(userId, limit)

2. Add endpoint: GET /alerts/:id/history

3. Include historyCount in alert list response

Update @apps/api/src/modules/alerts/alerts.service.ts
Update @apps/api/src/modules/alerts/alerts.controller.ts
```

---

### 2.3 Alerts Management UI

```
Create alerts management page for the web app.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 2.3)
Rules: @apps/web/.cursorrules

Create @apps/web/src/app/alerts/page.tsx with:
1. Alerts list with status filter (All, Active, Triggered, Paused)
2. Create alert dialog (multi-step form)
3. Alert types: Price Cross, Indicator Cross, Scan Match, % Change
4. Pause/Resume/Delete actions
5. Link to alert detail page

Create @apps/web/src/app/alerts/[id]/page.tsx with:
1. Alert configuration summary
2. Edit functionality
3. Trigger history timeline

Use shadcn/ui: Dialog, Form, Select, Switch, Badge, Table
Use TanStack Query for CRUD operations
```

---

### 2.4 Email Notifications

```
Integrate SendGrid for email notifications.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 2.4)

1. Install @sendgrid/mail

2. Create @apps/api/src/modules/notifications/
   - notifications.module.ts
   - notifications.service.ts
   - providers/sendgrid.provider.ts

3. Create HTML email template for alert triggered:
   - Alert name
   - Symbol and current price
   - Condition that triggered
   - Link to view in app

4. Call NotificationsService from alert-evaluation.worker.ts

Add SENDGRID_API_KEY and EMAIL_FROM to .env.example
```

---

## Phase 3: Discovery & Community

### 3.1 Discovery Service

```
Create discovery service for public scan browsing.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 3.1)

Create @apps/api/src/modules/discovery/
├── discovery.module.ts
├── discovery.controller.ts
├── discovery.service.ts
└── dto/discover-query.dto.ts

Endpoints:
- GET /discovery/scans - List public scans with filters
  - Query params: category, search, sortBy (popular|newest|rating), page
- GET /discovery/featured - Staff picks (isFeatured: true)
- GET /discovery/categories - Category stats (count per category)

Implement pagination (20 per page).
Include user info (id, name) in scan response.
```

---

### 3.2 Clone/Fork Functionality

````
Implement scan cloning functionality.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 3.2)

Add to DiscoveryService:
```typescript
async cloneScan(scanId: string, userId: string) {
  const original = await this.prisma.savedScan.findUnique({ where: { id: scanId } });
  if (!original) throw new NotFoundException();

  const cloned = await this.prisma.savedScan.create({
    data: {
      name: `${original.name} (Copy)`,
      definition: original.definition,
      userId,
      isPublic: false,
      clonedFromId: scanId,
    },
  });

  await this.prisma.savedScan.update({
    where: { id: scanId },
    data: { cloneCount: { increment: 1 } },
  });

  return cloned;
}
````

Add endpoint: POST /discovery/scans/:id/clone
Requires authentication.

```

---

### 3.3 Ratings System

```

Implement scan ratings system.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 3.3)

Add to DiscoveryService:

- rateScan(scanId, userId, rating) - Create/update rating 1-5
- removeRating(scanId, userId) - Delete user's rating
- updateAvgRating(scanId) - Recalculate avgRating on SavedScan

Endpoints:

- POST /discovery/scans/:id/rate - Body: { rating: 1-5 }
- DELETE /discovery/scans/:id/rate

Both require authentication.
Use transaction when updating avgRating.

```

---

### 3.4 Discover Page UI

```

Create discover/community page for the web app.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 3.4)
Rules: @apps/web/.cursorrules

Create @apps/web/src/app/discover/page.tsx with:

1. Featured scans section (horizontal scroll or carousel)
2. Category tabs: All, Breakout, Reversal, Momentum, Volume, etc.
3. Search bar
4. Sort dropdown: Popular, Newest, Top Rated
5. Scan grid with cards

Create scan card component showing:

- Name, description preview
- Category badge
- Stats: runs, clones, rating stars
- Actions: Run, Clone

Use TanStack Query for data fetching.
Add pagination or infinite scroll.

```

---

## Phase 4: Multi-Timeframe & Polish

### 4.1 Multi-Timeframe Support

```

Add multi-timeframe data fetching and scanning.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 4.1)

1. Add to MarketDataService (@apps/api/src/modules/market-data/market-data.service.ts):

```typescript
async getCandlesMultiTimeframe(symbol: string, timeframes: string[]) {
  const results: Record<string, any> = {};
  for (const tf of timeframes) {
    results[tf] = await this.getCandles(symbol, this.mapResolution(tf), from, to);
    await sleep(100); // Rate limit
  }
  return results;
}

mapResolution(tf: string): string {
  const map = { '1m': '1', '5m': '5', '15m': '15', 'daily': 'D', 'weekly': 'W' };
  return map[tf] || 'D';
}
```

2. Update filter config to accept timeframe per filter
3. Update MCP server scan logic to handle timeframes

```

---

### 4.2 Intraday Data Sync

```

Create intraday data ingestion worker.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 4.2)

Create @apps/api/src/modules/ingestion/workers/intraday-ingest.worker.ts

1. Schedule every 15 minutes
2. Check isMarketOpen() before running
3. Fetch 15-min candles for active symbols
4. Store with resolution flag

Add helper:

```typescript
isMarketOpen(): boolean {
  // Use MARKET_TIMEZONE (default: America/New_York) and check 9:30-16:00 local time.
}
```

```

---

### 4.3 Additional Indicators

```

Add Aroon and CCI indicators to MCP server.

Note: These were implemented during Phase 0 (MCP Server Indicators).

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 4.3)
File: @apps/mcp-server/server.py

Add Aroon indicator:

```python
def calculate_aroon(df: pd.DataFrame, period: int = 25) -> Dict[str, float]:
    aroon_up = ((period - df['high'].rolling(period+1).apply(
        lambda x: period - np.argmax(x))) / period) * 100
    aroon_down = ((period - df['low'].rolling(period+1).apply(
        lambda x: period - np.argmin(x))) / period) * 100
    return {
        'aroon_up': float(aroon_up.iloc[-1]),
        'aroon_down': float(aroon_down.iloc[-1]),
        'oscillator': float(aroon_up.iloc[-1] - aroon_down.iloc[-1])
    }
```

Add CCI indicator:

```python
def calculate_cci(df: pd.DataFrame, period: int = 20) -> float:
    tp = (df['high'] + df['low'] + df['close']) / 3
    sma = tp.rolling(period).mean()
    mad = tp.rolling(period).apply(lambda x: np.abs(x - x.mean()).mean())
    cci = (tp - sma) / (0.015 * mad)
    return float(cci.iloc[-1])
```

Register both in the indicator calculation switch statement.

```

---

### 4.4 Performance Optimization

```

Optimize performance across all apps.

Reference: @docs/IMPLEMENTATION_PLAN.md (Section 4.4)

API (@apps/api):

1. Add Redis caching for frequent queries (scans list, watchlists)
2. Add database indexes for: SavedScan(userId, isPublic), Alert(userId, status)
3. Fix N+1 queries with Prisma includes

Web (@apps/web):

1. Add dynamic imports for heavy components
2. Optimize images with next/image
3. Add React.memo to expensive list items

MCP Server (@apps/mcp-server):

1. Batch symbol fetching where possible
2. Parallelize indicator calculations for multiple symbols

Run benchmarks before and after to measure improvement.

```

---

## Utility Prompts

### Update Navigation

```

Update sidebar navigation to include all pages.

File: @apps/web/src/components/layout/sidebar.tsx (or equivalent)

Add nav items:

- Dashboard: / (Home icon)
- Scan Builder: /scans (Search icon)
- Saved Scans: /saved-scans (BookMarked icon)
- Discover: /discover (Compass icon)
- Watchlists: /watchlists (Eye icon)
- Alerts: /alerts (Bell icon)
- Symbols: /symbols (BarChart icon)

Use Lucide React icons.
Highlight active route.

```

---

### Run Database Migration

```

Run Prisma migration after schema changes.

Commands:
cd packages/database
npx prisma migrate dev --name <migration_name>
npx prisma generate

Then restart the API server.

```

---

### Test Endpoint

```

Test a specific API endpoint.

Using curl:
curl -X GET http://localhost:4001/api/<endpoint> \
 -H "Authorization: Bearer <token>" \
 -H "Content-Type: application/json"

Using the web app:

1. Open browser DevTools > Network tab
2. Navigate to the feature
3. Check request/response

```

---

### Mark Task Complete

```

Mark implementation task as complete.

Update @docs/IMPLEMENTATION_TRACKER.md:

1. Change task status from ⬜ Pending to ✅ Complete
2. Fill in Actual time, Completed date
3. Check off completed subtasks
4. Add entry to Completed Tasks Log
5. Update Quick Status progress count

```

---

_Copy the prompt you need and paste it to start working on that task._
```
