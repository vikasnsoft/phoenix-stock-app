# Stock Scanner - Phase-wise Implementation Plan

> **Created**: December 21, 2025  
> **Reference**: PRD_SCANNER_SCREENERS_MODULE.md, IMPROVEMENTS_PRODUCTION_READY.md

---

## Overview

This document provides detailed implementation steps for each phase of the Stock Scanner platform development.

---

## Phase 1: Core Infrastructure (Week 1-2)

### 1.1 Authentication System

**Priority**: 🔴 Critical  
**App**: API  
**Estimated Time**: 4-6 hours

#### Files to Create

```
apps/api/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── auth-response.dto.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
└── decorators/
    ├── current-user.decorator.ts
    └── roles.decorator.ts
```

#### Implementation Steps

1. **Install Dependencies**

   ```bash
   cd apps/api
   npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
   npm install -D @types/passport-jwt @types/bcrypt
   ```

2. **Create Auth Module**

   - Define `AuthModule` with imports: `JwtModule`, `PassportModule`, `DatabaseModule`
   - Register JWT with secret from env and 7d expiry
   - Export `AuthService`, `JwtStrategy`

3. **Create DTOs**

   - `LoginDto`: email (IsEmail), password (IsString, MinLength 6)
   - `RegisterDto`: email, password, name (optional)
   - `AuthResponseDto`: access_token, user object

4. **Create Auth Service**

   - `validateUser(email, password)`: Find user, compare bcrypt hash
   - `login(user)`: Generate JWT with payload {sub, email, role}
   - `register(dto)`: Hash password, create user, return login

5. **Create JWT Strategy**

   - Extract JWT from Bearer header
   - Validate payload, return user object

6. **Create Guards**

   - `JwtAuthGuard`: Extends AuthGuard('jwt')
   - `RolesGuard`: Check user.role against required roles

7. **Create Controller**

   - `POST /auth/login` - Login with email/password
   - `POST /auth/register` - Register new user
   - `GET /auth/me` - Get current user (protected)
   - `POST /auth/refresh` - Refresh token

8. **Update App Module**
   - Import `AuthModule`
   - Add global `APP_GUARD` for optional auth

#### Environment Variables

```env
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=7d
```

---

### 1.2 Rate Limiting

**Priority**: 🟡 High  
**App**: API  
**Estimated Time**: 1-2 hours

#### Implementation Steps

1. **Install Throttler**

   ```bash
   npm install @nestjs/throttler
   ```

2. **Configure in App Module**

   ```typescript
   ThrottlerModule.forRoot([
     { name: "short", ttl: 1000, limit: 3 }, // 3 req/sec
     { name: "medium", ttl: 60000, limit: 60 }, // 60 req/min
     { name: "long", ttl: 3600000, limit: 1000 }, // 1000 req/hour
   ]);
   ```

3. **Add Global Guard**

   ```typescript
   { provide: APP_GUARD, useClass: ThrottlerGuard }
   ```

4. **Custom Decorators for Endpoints**
   - `@SkipThrottle()` for health checks
   - `@Throttle({ short: { limit: 1, ttl: 1000 } })` for expensive ops

---

### 1.3 Discovery Schema Updates

**Priority**: 🟡 High  
**App**: Database (Prisma)  
**Estimated Time**: 2-3 hours

#### Schema Changes

1. **Update SavedScan Model**

   ```prisma
   model SavedScan {
     // Existing fields...

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
   ```

2. **Add ScanCategory Enum**

   ```prisma
   enum ScanCategory {
     BREAKOUT
     REVERSAL
     MOMENTUM
     VOLUME
     CANDLESTICK
     FUNDAMENTAL
     CUSTOM
   }
   ```

3. **Add ScanRating Model**

   ```prisma
   model ScanRating {
     id          String    @id @default(uuid())
     userId      String
     user        User      @relation(fields: [userId], references: [id])
     savedScanId String
     savedScan   SavedScan @relation(fields: [savedScanId], references: [id])
     rating      Int       // 1-5
     createdAt   DateTime  @default(now())

     @@unique([userId, savedScanId])
   }
   ```

4. **Add AlertHistory Model**
   ```prisma
   model AlertHistory {
     id               String   @id @default(uuid())
     alertId          String
     alert            Alert    @relation(fields: [alertId], references: [id])
     triggeredAt      DateTime @default(now())
     matchCount       Int
     matchedSymbols   String[]
     notificationSent Boolean  @default(false)
   }
   ```

#### Migration Steps

```bash
cd packages/database
npx prisma migrate dev --name add_discovery_fields
npx prisma generate
```

---

### 1.4 Dashboard Home Page

**Priority**: 🟡 High  
**App**: Web  
**Estimated Time**: 4-6 hours

#### Files to Create

```
apps/web/src/app/(dashboard)/
├── page.tsx                    # Dashboard home
├── layout.tsx                  # Dashboard layout
└── _components/
    ├── recent-scans-widget.tsx
    ├── watchlist-summary-widget.tsx
    ├── alerts-widget.tsx
    ├── market-overview-widget.tsx
    └── quick-actions-grid.tsx
```

#### Implementation Steps

1. **Create Dashboard Layout**

   - Header with user info, logout
   - Sidebar navigation (shared)
   - Main content area

2. **Create Widgets**

   - `RecentScansWidget`: List last 5 scans with run button
   - `WatchlistSummaryWidget`: Count of watchlists, total symbols
   - `AlertsWidget`: Active alerts count, recent triggers
   - `MarketOverviewWidget`: Key indices (if available)

3. **Create Quick Actions Grid**

   - Cards linking to: Run Scan, Saved Scans, Alerts, Watchlists
   - Each card with icon, label, brief description

4. **Wire Up Data Fetching**
   - TanStack Query hooks for each widget
   - Loading skeletons for each widget
   - Error states with retry

---

## Phase 2: Alerts & Notifications (Week 3-4)

### 2.1 Alert Evaluation Worker (Production)

**Priority**: 🔴 Critical  
**App**: API  
**Estimated Time**: 6-8 hours

#### Files to Modify/Create

```
apps/api/src/modules/alerts/
├── workers/
│   └── alert-evaluation.worker.ts  # Modify
├── services/
│   └── notification.service.ts     # Create
└── dto/
    └── alert-condition.dto.ts      # Create
```

#### Implementation Steps

1. **Define Alert Condition Types**

   ```typescript
   type AlertType =
     | "PRICE_CROSS"
     | "INDICATOR_CROSS"
     | "SCAN_MATCH"
     | "PERCENT_CHANGE";

   interface AlertCondition {
     type: AlertType;
     symbol: string;
     threshold?: number;
     direction?: "above" | "below";
     indicator?: string;
     indicatorParams?: Record<string, any>;
     scanId?: string;
     percentChange?: number;
     timeframe?: string;
   }
   ```

2. **Implement Evaluation Methods**

   - `evaluatePriceCross(condition)`: Check if price crossed threshold
   - `evaluateIndicatorCross(condition)`: Check indicator crossover
   - `evaluateScanMatch(condition)`: Run saved scan, check matches
   - `evaluatePercentChange(condition)`: Check % change from previous close

3. **Implement Alert Triggering**

   - Update alert status to TRIGGERED
   - Create AlertHistory record
   - Queue notification jobs

4. **Schedule Evaluation**
   - Run every 5 minutes during market hours
   - Run EOD evaluation at market close

---

### 2.2 Alert History Tracking

**Priority**: 🟡 High  
**App**: API  
**Estimated Time**: 2-3 hours

#### Implementation Steps

1. **Create AlertHistory Service**

   - `create(alertId, matchCount, matchedSymbols)`
   - `getByAlertId(alertId, pagination)`
   - `getRecentTriggers(userId, limit)`

2. **Update Alert Endpoints**
   - `GET /alerts/:id/history` - Get trigger history
   - Include history count in alert list response

---

### 2.3 Alerts Management UI

**Priority**: 🟡 High  
**App**: Web  
**Estimated Time**: 6-8 hours

#### Files to Create

```
apps/web/src/app/alerts/
├── page.tsx                    # Alerts list
├── [id]/
│   └── page.tsx               # Alert detail + history
└── _components/
    ├── alerts-list.tsx
    ├── alert-card.tsx
    ├── create-alert-dialog.tsx
    ├── alert-form.tsx
    └── alert-history-list.tsx
```

#### Implementation Steps

1. **Create Alerts List Page**

   - Filter by status: All, Active, Triggered, Paused
   - Sort by: Created, Last Triggered
   - Bulk actions: Pause, Resume, Delete

2. **Create Alert Dialog**

   - Step 1: Choose alert type
   - Step 2: Configure condition (symbol, threshold, etc.)
   - Step 3: Set notification channels
   - Preview before create

3. **Create Alert Detail Page**
   - Alert configuration summary
   - Edit functionality
   - Trigger history timeline
   - Pause/Resume/Delete actions

---

### 2.4 Email Notification Integration

**Priority**: 🟢 Medium  
**App**: API  
**Estimated Time**: 3-4 hours

#### Files to Create

```
apps/api/src/modules/notifications/
├── notifications.module.ts
├── notifications.service.ts
├── providers/
│   └── sendgrid.provider.ts
└── templates/
    └── alert-triggered.template.ts
```

#### Implementation Steps

1. **Install SendGrid**

   ```bash
   npm install @sendgrid/mail
   ```

2. **Create Email Provider**

   - Initialize with `SENDGRID_API_KEY`
   - `sendEmail(to, subject, html)`

3. **Create Alert Templates**

   - HTML template for alert triggered
   - Include: Alert name, Symbol, Condition, Current value, Link to app

4. **Integrate with Worker**
   - Call notification service when alert triggers
   - Log notification status in AlertHistory

---

## Phase 3: Discovery & Community (Week 5-6)

### 3.1 Discovery Service

**Priority**: 🟡 High  
**App**: API  
**Estimated Time**: 4-5 hours

#### Files to Create

```
apps/api/src/modules/discovery/
├── discovery.module.ts
├── discovery.controller.ts
├── discovery.service.ts
└── dto/
    ├── discover-query.dto.ts
    └── scan-card.dto.ts
```

#### Implementation Steps

1. **Create Discovery Endpoints**

   - `GET /discovery/scans` - List public scans with filters
   - `GET /discovery/featured` - Staff picks
   - `GET /discovery/categories` - Category stats
   - `POST /discovery/scans/:id/clone` - Clone a scan

2. **Implement Query Logic**
   - Filter by category, tags, search term
   - Sort by: popular (runCount), newest, rating, clones
   - Pagination with cursor or offset

---

### 3.2 Clone/Fork Functionality

**Priority**: 🟡 High  
**App**: API  
**Estimated Time**: 2-3 hours

#### Implementation Steps

1. **Clone Service Method**

   - Copy scan definition
   - Set `clonedFromId` reference
   - Increment original's `cloneCount`
   - Set `isPublic: false` for clone

2. **Track Lineage**
   - Show "Cloned from X" on scan card
   - Link to original scan

---

### 3.3 Ratings System

**Priority**: 🟢 Medium  
**App**: API  
**Estimated Time**: 2-3 hours

#### Implementation Steps

1. **Rating Endpoints**

   - `POST /discovery/scans/:id/rate` - Rate 1-5
   - `DELETE /discovery/scans/:id/rate` - Remove rating

2. **Calculate Average**
   - Update `avgRating` on SavedScan when rating changes
   - Use transaction to ensure consistency

---

### 3.4 Discover Page UI

**Priority**: 🟡 High  
**App**: Web  
**Estimated Time**: 6-8 hours

#### Files to Create

```
apps/web/src/app/discover/
├── page.tsx
└── _components/
    ├── featured-scans-section.tsx
    ├── category-tabs.tsx
    ├── scan-search-bar.tsx
    ├── scan-grid.tsx
    ├── scan-card.tsx
    └── rating-stars.tsx
```

#### Implementation Steps

1. **Create Discover Page**

   - Hero section with featured scans carousel
   - Category tabs: All, Breakout, Reversal, Momentum, etc.
   - Search bar with autocomplete
   - Sort dropdown: Popular, Newest, Top Rated

2. **Create Scan Card**

   - Name, description preview
   - Category badge
   - Stats: runs, clones, rating
   - Actions: Run, Clone, View Details

3. **Wire Up Interactivity**
   - Clone with toast confirmation
   - Rate with stars (authenticated only)
   - Run redirects to scan builder with filters loaded

---

## Phase 4: Multi-Timeframe & Polish (Week 7-8)

### 4.1 Multi-Timeframe Support

**Priority**: 🟡 High  
**App**: API, MCP Server  
**Estimated Time**: 4-6 hours

#### Implementation Steps

1. **API: Update Market Data Service**

   - `getCandlesMultiTimeframe(symbol, timeframes[])`
   - Cache each timeframe separately
   - Rate limit handling for multiple calls

2. **API: Update Scans Service**

   - Accept timeframe per filter
   - Fetch required timeframes before evaluation

3. **MCP: Update Scan Logic**
   - Support `timeframe` in filter config
   - Fetch and evaluate across timeframes

---

### 4.2 Intraday Data Sync (15-min)

**Priority**: 🟡 High  
**App**: API  
**Estimated Time**: 3-4 hours

#### Implementation Steps

1. **Create Intraday Worker**

   - Schedule every 15 minutes during market hours
   - Fetch 15-min candles for active symbols
   - Store in separate table or with resolution flag

2. **Market Hours Detection**
   - `isMarketOpen()` helper
   - Skip sync outside market hours

---

### 4.3 Additional Indicators (Aroon, CCI)

**Priority**: 🟢 Medium  
**App**: MCP Server  
**Estimated Time**: 2-3 hours

#### Implementation Steps

1. **Add Aroon Indicator**

   ```python
   def calculate_aroon(df, period=25):
       # Returns aroon_up, aroon_down, oscillator
   ```

2. **Add CCI Indicator**

   ```python
   def calculate_cci(df, period=20):
       # Returns CCI value
   ```

3. **Register in Filter Engine**
   - Add to supported indicators list
   - Update documentation

---

### 4.4 Performance Optimization

**Priority**: 🟢 Medium  
**App**: All  
**Estimated Time**: 4-6 hours

#### Optimization Areas

1. **API Caching**

   - Redis caching for frequent queries
   - Cache invalidation strategy

2. **Database Queries**

   - Add indexes for common queries
   - Optimize N+1 queries with includes

3. **Frontend**

   - Code splitting for routes
   - Image optimization
   - React.memo for expensive components

4. **MCP Server**
   - Batch symbol fetching
   - Parallel indicator calculation

---

## Testing Checklist

### Per Phase

- [ ] Unit tests for new services
- [ ] Integration tests for new endpoints
- [ ] E2E tests for critical flows
- [ ] Manual testing in browser

### Critical Paths

- [ ] User registration → Login → Access protected route
- [ ] Create alert → Trigger → Receive notification
- [ ] Clone scan → Modify → Run
- [ ] Multi-timeframe scan execution

---

## Deployment Notes

### Environment Variables Required

```env
# Phase 1
JWT_SECRET=xxx
JWT_EXPIRES_IN=7d

# Phase 2
SENDGRID_API_KEY=xxx
EMAIL_FROM=alerts@yourapp.com

# Existing
DATABASE_URL=xxx
FINNHUB_API_KEY=xxx
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Database Migrations

Run after each schema change:

```bash
cd packages/database
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

---

_Document version: 1.0 | Last updated: December 21, 2025_
