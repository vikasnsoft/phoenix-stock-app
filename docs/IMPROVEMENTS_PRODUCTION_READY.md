# Production-Ready Improvements for Stock Scanner Platform

> **Date**: December 21, 2025  
> **Scope**: Web, API, MCP Server applications  
> **Data Source**: Finnhub API (https://finnhub.io/docs/api)

---

## Executive Summary

This document provides production-ready implementation specifications aligned with the PRD requirements.

---

## 1. PRD Alignment Matrix

| PRD Requirement                        | Status        | Gap                | Priority |
| -------------------------------------- | ------------- | ------------------ | -------- |
| FR-FE-1 to FR-FE-7: Filter Engine Core | ✅ Done       | -                  | -        |
| FR-FE-8: Min/Max Functions             | ⚠️ Partial    | Need UI            | Medium   |
| FR-FE-9: Fundamental Filters           | ⚠️ Backend    | Need web UI        | Medium   |
| FR-SM-4: Clone/Fork Scan               | ❌ Missing    | Full impl          | **High** |
| FR-SM-6: Tag Scans                     | ❌ Missing    | Schema + UI        | Medium   |
| FR-ED-2: Multi-Timeframe               | ⚠️ Daily only | Need 15-min/weekly | **High** |
| FR-ED-4: Intraday Data                 | ❌ Missing    | Full impl          | **High** |
| FR-DC-1 to FR-DC-6: Discovery          | ❌ Missing    | Full impl          | **High** |
| FR-AL-1 to FR-AL-6: Alerts             | ⚠️ Partial    | Need full impl     | **High** |
| Authentication                         | ❌ Missing    | Full impl          | **High** |

---

## 2. API Application Improvements

### 2.1 Authentication System

**Files to create:**

- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`

**Dependencies:**

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

**Key Implementation:**

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  async login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(email: string, password: string, name?: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, role: "FREE", status: "ACTIVE" },
    });
    return this.login(user);
  }
}
```

---

### 2.2 Alert Evaluation Worker (Production)

**Current:** Placeholder logic  
**Required:** Full evaluation with Finnhub data

```typescript
// alert-evaluation.worker.ts - Key methods
async evaluatePriceCross(condition: AlertCondition): Promise<boolean> {
  const candles = await this.marketData.getCandles(
    condition.symbol, 'D',
    Math.floor(Date.now()/1000) - 172800, // 2 days ago
    Math.floor(Date.now()/1000)
  );

  if (candles.s !== 'ok' || candles.c.length < 2) return false;

  const current = candles.c[candles.c.length - 1];
  const previous = candles.c[candles.c.length - 2];

  if (condition.direction === 'above') {
    return previous < condition.threshold && current >= condition.threshold;
  }
  return previous > condition.threshold && current <= condition.threshold;
}

async triggerAlert(alert: Alert): Promise<void> {
  await this.prisma.alert.update({
    where: { id: alert.id },
    data: { status: 'TRIGGERED', triggeredAt: new Date() }
  });

  // Create history record
  await this.prisma.alertHistory.create({
    data: { alertId: alert.id, matchCount: 1, notificationSent: true }
  });

  // Send notifications
  if (alert.emailNotify) await this.sendEmailNotification(alert);
}
```

---

### 2.3 Discovery Service (New Module)

**Schema Updates (prisma/schema.prisma):**

```prisma
model SavedScan {
  // Add these fields
  category      ScanCategory?
  tags          String[]
  runCount      Int            @default(0)
  cloneCount    Int            @default(0)
  avgRating     Decimal?       @db.Decimal(3, 2)
  isFeatured    Boolean        @default(false)
  clonedFromId  String?
  clonedFrom    SavedScan?     @relation("ScanClones", fields: [clonedFromId], references: [id])
  clones        SavedScan[]    @relation("ScanClones")
  ratings       ScanRating[]
}

enum ScanCategory {
  BREAKOUT
  REVERSAL
  MOMENTUM
  VOLUME
  CANDLESTICK
  FUNDAMENTAL
  CUSTOM
}

model ScanRating {
  id          String    @id @default(uuid())
  userId      String
  savedScanId String
  rating      Int       // 1-5
  @@unique([userId, savedScanId])
}

model AlertHistory {
  id             String   @id @default(uuid())
  alertId        String
  triggeredAt    DateTime @default(now())
  matchCount     Int
  matchedSymbols String[]
}
```

**Service Implementation:**

```typescript
// discovery.service.ts
@Injectable()
export class DiscoveryService {
  async discoverScans(query: DiscoverScansQuery) {
    const where: any = { isPublic: true };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const orderBy = {
      [query.sortBy === "popular" ? "runCount" : "createdAt"]: "desc",
    };

    return this.prisma.savedScan.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * 20,
      take: 20,
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async cloneScan(scanId: string, userId: string) {
    const original = await this.prisma.savedScan.findUnique({
      where: { id: scanId },
    });
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
}
```

---

### 2.4 Multi-Timeframe with Finnhub

**Finnhub Resolutions:** `1, 5, 15, 30, 60, D, W, M`

```typescript
// market-data.service.ts - Add methods
async getCandlesMultiTimeframe(symbol: string, timeframes: string[]) {
  const results: Record<string, FinnhubCandle> = {};
  const now = Math.floor(Date.now() / 1000);
  const from = now - (365 * 24 * 60 * 60);

  for (const tf of timeframes) {
    const resolution = this.mapTimeframeToResolution(tf);
    results[tf] = await this.getCandles(symbol, resolution, from, now);
    await new Promise(r => setTimeout(r, 100)); // Rate limit
  }
  return results;
}

private mapTimeframeToResolution(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1', '5m': '5', '15m': '15', '30m': '30',
    '1h': '60', 'daily': 'D', 'weekly': 'W', 'monthly': 'M'
  };
  return map[tf.toLowerCase()] || 'D';
}

isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return mins >= 870 && mins < 1260; // 14:30-21:00 UTC
}
```

---

### 2.5 Rate Limiting

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },
      { name: 'medium', ttl: 60000, limit: 60 },
      { name: 'long', ttl: 3600000, limit: 1000 }
    ])
  ]
})
```

---

## 3. Web Application Improvements

### 3.1 Dashboard Home Page

Replace `apps/web/src/app/page.tsx` with functional dashboard:

**Components to add:**

- `RecentScansWidget` - Shows last 5 scan runs
- `WatchlistSummaryWidget` - Quick stats on watchlists
- `AlertsWidget` - Active alerts count + recent triggers
- `MarketOverviewWidget` - Key market indices

**Quick Actions Grid:**

- Run Scan → `/scans`
- Saved Scans → `/saved-scans`
- Alerts → `/alerts`
- Watchlists → `/watchlists`

---

### 3.2 Alerts Management Page

**Create:** `apps/web/src/app/alerts/page.tsx`

**Features:**

- List all alerts with status badges
- Create alert dialog (Price Cross, Indicator Cross, Scan Match, % Change)
- Pause/Resume/Delete actions
- Alert history view
- Notification channel toggles (Email, Push)

---

### 3.3 Discover/Community Page

**Create:** `apps/web/src/app/discover/page.tsx`

**Features:**

- Featured scans section (Staff Picks)
- Search bar with category tabs
- Sort by: Popular, Newest, Rating, Clones
- Scan cards with Run/Clone buttons
- Pagination

---

### 3.4 Navigation Update

Update `apps/web/src/components/layout/sidebar.tsx`:

```typescript
const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/scans", label: "Scan Builder", icon: Search },
  { href: "/saved-scans", label: "Saved Scans", icon: BookMarked },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/watchlists", label: "Watchlists", icon: Eye },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/symbols", label: "Symbols", icon: BarChart },
];
```

---

## 4. MCP Server Improvements

### 4.1 Add Missing Indicators

**Aroon Indicator:**

```python
def calculate_aroon(df: pd.DataFrame, period: int = 25) -> Dict:
    aroon_up = ((period - df['high'].rolling(period+1).apply(
        lambda x: period - np.argmax(x))) / period) * 100
    aroon_down = ((period - df['low'].rolling(period+1).apply(
        lambda x: period - np.argmin(x))) / period) * 100
    return {
        'aroon_up': aroon_up.iloc[-1],
        'aroon_down': aroon_down.iloc[-1],
        'oscillator': aroon_up.iloc[-1] - aroon_down.iloc[-1]
    }
```

**CCI Indicator:**

```python
def calculate_cci(df: pd.DataFrame, period: int = 20) -> float:
    tp = (df['high'] + df['low'] + df['close']) / 3
    sma = tp.rolling(period).mean()
    mad = tp.rolling(period).apply(lambda x: np.abs(x - x.mean()).mean())
    cci = (tp - sma) / (0.015 * mad)
    return cci.iloc[-1]
```

### 4.2 Add Fundamental Filters

```python
FUNDAMENTAL_FILTERS = [
    'pe_ratio', 'eps', 'market_cap', 'dividend_yield',
    'debt_to_equity', 'book_value', 'price_to_book', 'roe'
]

def evaluate_fundamental_filter(symbol: str, filter_def: dict) -> bool:
    financials = get_financials_from_db(symbol)
    if not financials: return False

    field = filter_def['field']
    operator = filter_def['operator']
    value = filter_def['value']

    actual = financials.get(field)
    if actual is None: return False

    return compare(actual, operator, value)
```

---

## 5. Implementation Roadmap

### Phase 1 (Week 1-2): Core Infrastructure

1. ✅ Authentication system
2. ✅ Rate limiting
3. ✅ Discovery schema updates
4. ✅ Dashboard home page

### Phase 2 (Week 3-4): Alerts & Notifications

1. ✅ Alert evaluation worker (production)
2. ✅ Alert history tracking
3. ✅ Alerts management UI
4. ✅ Email notification integration

### Phase 3 (Week 5-6): Discovery & Community

1. ✅ Discovery service
2. ✅ Clone/Fork functionality
3. ✅ Ratings system
4. ✅ Discover page UI

### Phase 4 (Week 7-8): Multi-Timeframe & Polish

1. ✅ Multi-timeframe support
2. ✅ Intraday data sync (15-min)
3. ✅ Additional indicators (Aroon, CCI)
4. ✅ Performance optimization

---

## 6. Environment Variables

Add to `.env`:

```env
# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Finnhub API
FINNHUB_API_KEY=your-finnhub-api-key

# Email (SendGrid example)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=alerts@yourapp.com

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=60
```

---

## 7. Finnhub API Endpoints Used

| Endpoint          | Purpose          | Rate Limit |
| ----------------- | ---------------- | ---------- |
| `/stock/candle`   | OHLCV data       | 60/min     |
| `/stock/profile2` | Company info     | 60/min     |
| `/stock/metric`   | Financials       | 60/min     |
| `/quote`          | Real-time quote  | 60/min     |
| `/stock/symbol`   | Symbol list      | 60/min     |
| WebSocket         | Real-time trades | Unlimited  |

---

_Document created: December 21, 2025_
