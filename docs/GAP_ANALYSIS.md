# Stock Scanner - Gap Analysis

> **Created**: December 21, 2025  
> **Reference**: PRD, IMPROVEMENTS_PRODUCTION_READY.md, Chartink Scanner User Guide

---

## Executive Summary

This document analyzes the gaps between:

1. **PRD Requirements** (docs/PRD_SCANNER_SCREENERS_MODULE.md)
2. **Chartink Scanner User Guide** (reference implementation)
3. **Current Implementation** (apps/api, apps/web, apps/mcp-server)

---

## 1. Filter Engine Gaps

### 1.1 Current Implementation Status

| Feature                 | PRD Requirement     | Chartink | Current Status                            | Gap                               |
| ----------------------- | ------------------- | -------- | ----------------------------------------- | --------------------------------- |
| **Stock Attributes**    | OHLCV               | ✅       | ✅ Implemented                            | ✅ None                           |
| **Offsets**             | 0-252 candles       | ✅       | ⚠️ Limited (up to 252d but fixed options) | Need custom N input               |
| **Indicators**          | 12+                 | ✅       | ⚠️ 10 in UI, more in backend              | Missing: Aroon, CCI, Pivot Points |
| **Comparisons**         | >, <, =, >=, <=     | ✅       | ✅ Implemented                            | ✅ None                           |
| **Crossovers**          | crossed_above/below | ✅       | ❌ Missing in UI                          | **HIGH PRIORITY**                 |
| **Arithmetic**          | +, -, \*, /         | ✅       | ⚠️ Partial (arithmeticOperator exists)    | Need full expression builder      |
| **Min/Max Functions**   | Period + Measure    | ✅       | ⚠️ Types exist, no UI                     | **HIGH PRIORITY**                 |
| **Fundamental Filters** | P/E, EPS, etc.      | ✅       | ⚠️ Types exist, limited UI                | Need dropdown/selector            |
| **Sub-filters/Groups**  | AND/OR nesting      | ✅       | ✅ FilterGroup type exists                | UI needs improvement              |

### 1.2 Missing Filter UI Components

Based on Chartink Scanner User Guide analysis:

#### **CRITICAL: Crossover Operations**

Chartink Example:

```
Close crossed above SMA(20)
```

**Current Gap**:

- `OperatorType` includes `crosses_above`, `crosses_below` in types
- UI `OPERATOR_OPTIONS` only has: `>`, `<`, `>=`, `<=`, `==`
- **Missing**: Crossover options in dropdown

**Fix Required**:

```typescript
// apps/web/src/features/scans/components/unified/inline-filter-editor.tsx
const OPERATOR_OPTIONS = [
  { value: ">", label: "Greater than" },
  { value: "<", label: "Less than" },
  { value: ">=", label: "Greater than equal" },
  { value: "<=", label: "Less than equal" },
  { value: "==", label: "Equals" },
  // ADD THESE:
  { value: "crosses_above", label: "Crossed above" },
  { value: "crosses_below", label: "Crossed below" },
];
```

---

#### **CRITICAL: Min/Max Functional Filters**

Chartink Example:

```
High = Max(High, 252)  // 52-week high
Low = Min(Low, 252)    // 52-week low
```

**Current Gap**:

- `IndicatorType` includes `max`, `min`
- No UI component to configure period + measure parameters
- No way to select Min/Max as LHS measure

**Fix Required**:

1. Add Min/Max to ATTRIBUTE_OPTIONS with special handling
2. Create parameter input for Period (1-252)
3. Create measure selector for what to apply Min/Max on

---

#### **HIGH: Arithmetic Expression Builder**

Chartink Example:

```
Open > (1 day ago Close * 1.03)  // Gap up 3%
```

**Current Gap**:

- `FilterExpression` has `arithmeticOperator` and `arithmeticValue`
- No UI to build arithmetic expressions
- Can't chain operations

**Fix Required**:

1. Add arithmetic operator selector (+, -, \*, /)
2. Add arithmetic value input
3. Show in filter row: `[Measure] [ArithOp] [Value] [CompareOp] [RHS]`

---

#### **MEDIUM: Indicator Parameter Configuration**

Chartink Example:

```
SMA(close, 20)  // Parameters: source, period
MACD(12, 26, 9) // Parameters: fast, slow, signal
```

**Current Gap**:

- Indicators are just strings like "rsi", "sma"
- No UI to configure indicator parameters
- Backend expects Indicator object with `parameters[]`

**Fix Required**:

1. When indicator selected, show parameter inputs
2. Default parameters per indicator:
   - RSI: [14]
   - SMA/EMA: [20]
   - MACD: [12, 26, 9]
   - Bollinger: [20, 2]
   - ADX: [14]
   - ATR: [14]
   - Stochastic: [14, 3]

---

#### **MEDIUM: Sub-filter Groups UI**

Chartink Example:

```
(Close > 200) AND ((RSI > 70) OR (MACD crossed above 0))
```

**Current Gap**:

- `FilterGroup` type exists with `conjunction: AND | OR`
- UI has `ScanFilterGroup` component
- Visual grouping/nesting needs improvement
- No drag-and-drop reordering

**Fix Required**:

1. Visual group indicators (border/background)
2. Ability to nest groups (max 3 levels per PRD)
3. Drag-and-drop between groups
4. Toggle AND/OR per group

---

### 1.3 Indicator Coverage Gap

| Indicator       | PRD Required | Chartink | Backend (MCP) | Web UI     |
| --------------- | ------------ | -------- | ------------- | ---------- |
| RSI             | ✅           | ✅       | ✅            | ✅         |
| SMA             | ✅           | ✅       | ✅            | ✅         |
| EMA             | ✅           | ✅       | ✅            | ✅         |
| MACD            | ✅           | ✅       | ✅            | ✅         |
| Bollinger Bands | ✅           | ✅       | ✅            | ❌ Missing |
| ADX             | ✅           | ✅       | ✅            | ❌ Missing |
| ATR             | ✅           | ✅       | ✅            | ❌ Missing |
| Supertrend      | ✅           | ✅       | ✅            | ❌ Missing |
| VWAP            | ✅           | ✅       | ✅            | ❌ Missing |
| Stochastic      | ✅           | ✅       | ✅            | ❌ Missing |
| Aroon           | ✅           | ✅       | ❌ Missing    | ❌ Missing |
| CCI             | ✅           | ✅       | ❌ Missing    | ❌ Missing |
| Pivot Points    | ✅           | ✅       | ❌ Missing    | ❌ Missing |
| Ichimoku        | Optional     | ✅       | ✅            | ❌ Missing |
| Parabolic SAR   | Optional     | ✅       | ✅            | ❌ Missing |
| Williams %R     | Optional     | ✅       | ❌ Missing    | ❌ Missing |
| OBV             | Optional     | ✅       | ❌ Missing    | ❌ Missing |

---

## 2. Application-Level Gaps

### 2.1 Web Application Gaps

| Feature                  | PRD      | Status                    | Gap                        |
| ------------------------ | -------- | ------------------------- | -------------------------- |
| **Home Dashboard**       | Required | ❌ Placeholder page       | Full rebuild needed        |
| **Scan Builder**         | Required | ⚠️ Functional but limited | Missing features above     |
| **Saved Scans Page**     | Required | ✅ Exists                 | Minor improvements         |
| **Watchlists Page**      | Required | ✅ Exists                 | OK                         |
| **Alerts Page**          | Required | ❌ Missing                | **HIGH PRIORITY**          |
| **Discover Page**        | Required | ❌ Missing                | **HIGH PRIORITY**          |
| **Authentication UI**    | Required | ❌ Missing                | **HIGH PRIORITY**          |
| **Navigation/Sidebar**   | Required | ⚠️ Basic navbar           | Need sidebar               |
| **Result Enrichment**    | Required | ⚠️ Basic table            | Need sparklines, more data |
| **Live Preview**         | Required | ❌ Missing                | Plain-English preview      |
| **Educational Tooltips** | Required | ❌ Missing                | "?" icons, explanations    |
| **Loading States**       | Required | ⚠️ Basic                  | Need skeletons             |
| **Error States**         | Required | ⚠️ Toast only             | Need inline errors         |

### 2.2 API Application Gaps

| Feature                | PRD      | Status        | Gap                     |
| ---------------------- | -------- | ------------- | ----------------------- |
| **Authentication**     | Required | ❌ Missing    | JWT auth system         |
| **Rate Limiting**      | Required | ❌ Missing    | Throttler config        |
| **Scans Module**       | Required | ✅ Exists     | OK                      |
| **Saved Scans Module** | Required | ✅ Exists     | Need clone, tags        |
| **Watchlists Module**  | Required | ✅ Exists     | OK                      |
| **Alerts Module**      | Required | ⚠️ CRUD only  | Need evaluation worker  |
| **Discovery Module**   | Required | ❌ Missing    | **HIGH PRIORITY**       |
| **Market Data Module** | Required | ✅ Exists     | OK                      |
| **Multi-timeframe**    | Required | ⚠️ Daily only | Need 15min, weekly      |
| **Segment Filtering**  | Required | ⚠️ Basic      | Need F&O, Nifty indices |

### 2.3 MCP Server Gaps

| Feature                  | PRD      | Status            | Gap                |
| ------------------------ | -------- | ----------------- | ------------------ |
| **Core Indicators**      | 12+      | ⚠️ 10 implemented | Missing Aroon, CCI |
| **Crossover Logic**      | Required | ✅ Implemented    | OK                 |
| **Min/Max Functions**    | Required | ✅ Implemented    | OK                 |
| **Fundamental Filters**  | Required | ⚠️ Partial        | Need full metrics  |
| **Multi-timeframe**      | Required | ✅ Implemented    | OK                 |
| **Candlestick Patterns** | Optional | ✅ Implemented    | OK                 |
| **Natural Language**     | Optional | ✅ Implemented    | OK                 |

---

## 3. Chartink Feature Alignment

### 3.1 Filter Builder UX Comparison

| Chartink Feature                    | Our Status     | Notes                         |
| ----------------------------------- | -------------- | ----------------------------- |
| **Inline dropdown editing**         | ✅ Implemented | Similar approach              |
| **Auto-offset on attribute select** | ❌ Missing     | Should auto-add "Latest"      |
| **Parameter display (close, 20)**   | ❌ Missing     | Need to show indicator params |
| **Add filter icon button**          | ✅ Implemented | + button exists               |
| **Filter behavior toggle**          | ✅ Implemented | passes/fails exists           |
| **passes ANY/ALL toggle**           | ✅ Implemented | conjunction exists            |
| **Sub-filter grouping**             | ⚠️ Partial     | UI needs work                 |
| **Drag-and-drop**                   | ❌ Missing     | Need dnd-kit                  |
| **Delete/duplicate buttons**        | ✅ Implemented | Hover actions exist           |

### 3.2 Scan Examples from Chartink (Test Cases)

These should work in our system:

1. **RSI Overbought Crossover**

   ```
   Latest daily RSI(14) crossed above 70
   ```

   - Status: ❌ Can't create (no crossover in UI)

2. **Gap Up 3%**

   ```
   Latest daily Open > (1 day ago Close * 1.03)
   ```

   - Status: ❌ Can't create (no arithmetic in UI)

3. **52-Week High**

   ```
   Latest daily High = Max(High, 252)
   ```

   - Status: ❌ Can't create (no Min/Max in UI)

4. **Golden Cross (SMA50 > SMA200)**

   ```
   Latest daily SMA(close, 50) crossed above SMA(close, 200)
   ```

   - Status: ❌ Can't create (no crossover + no indicator params)

5. **Close > SMA20**
   ```
   Latest daily Close > SMA(close, 20)
   ```
   - Status: ⚠️ Partially works (no indicator params visible)

---

## 4. Priority Implementation List

### Critical (Must Have for MVP)

| #   | Gap                                | Effort | Impact                     |
| --- | ---------------------------------- | ------ | -------------------------- |
| 1   | Add crossover operators to UI      | 2 hrs  | Enables breakout scans     |
| 2   | Add indicator parameter inputs     | 4 hrs  | Proper indicator config    |
| 3   | Add Min/Max function UI            | 4 hrs  | Enables N-day high/low     |
| 4   | Add arithmetic expression UI       | 4 hrs  | Enables % calculations     |
| 5   | Add more indicators to UI dropdown | 2 hrs  | Match backend capabilities |
| 6   | Create Alerts page                 | 8 hrs  | Core PRD requirement       |
| 7   | Create Discover page               | 8 hrs  | Core PRD requirement       |
| 8   | Implement Authentication           | 6 hrs  | Security requirement       |

### High Priority

| #   | Gap                     | Effort | Impact            |
| --- | ----------------------- | ------ | ----------------- |
| 9   | Dashboard home page     | 6 hrs  | Better UX         |
| 10  | Sub-filter grouping UI  | 6 hrs  | Complex scans     |
| 11  | Discovery service (API) | 5 hrs  | Public scans      |
| 12  | Alert evaluation worker | 8 hrs  | Notifications     |
| 13  | Navigation sidebar      | 4 hrs  | Better navigation |

### Medium Priority

| #   | Gap                            | Effort | Impact          |
| --- | ------------------------------ | ------ | --------------- |
| 14  | Add Aroon, CCI indicators      | 3 hrs  | More indicators |
| 15  | Result enrichment (sparklines) | 4 hrs  | Better results  |
| 16  | Educational tooltips           | 4 hrs  | User education  |
| 17  | Live plain-English preview     | 3 hrs  | Better UX       |
| 18  | Drag-and-drop filters          | 4 hrs  | Better UX       |

---

## 5. Filter UI Fix Checklist

### `inline-filter-editor.tsx` Updates

- [ ] Add crossover operators to `OPERATOR_OPTIONS`
- [ ] Add all indicators to `ATTRIBUTE_OPTIONS`:
  - [ ] Bollinger Bands (bb_upper, bb_middle, bb_lower)
  - [ ] ADX, ATR, Supertrend
  - [ ] VWAP, Stochastic
  - [ ] Aroon, CCI
- [ ] Add indicator parameter configuration
- [ ] Add arithmetic operator selector
- [ ] Add arithmetic value input
- [ ] Show plain-English preview of filter

### New Components Needed

- [ ] `indicator-param-editor.tsx` - Configure indicator parameters
- [ ] `min-max-function-editor.tsx` - Configure Min/Max functions
- [ ] `arithmetic-expression-builder.tsx` - Build arithmetic expressions
- [ ] `filter-group-container.tsx` - Visual grouping with AND/OR toggle

### New Pages Needed

- [ ] `apps/web/src/app/alerts/page.tsx`
- [ ] `apps/web/src/app/discover/page.tsx`
- [ ] `apps/web/src/app/(auth)/login/page.tsx`
- [ ] `apps/web/src/app/(auth)/register/page.tsx`

---

## 6. Backend Gaps Summary

### API Module Gaps

| Module      | Gap                           | Fix                     |
| ----------- | ----------------------------- | ----------------------- |
| auth        | Entire module missing         | Create with JWT, bcrypt |
| alerts      | Evaluation worker placeholder | Implement full logic    |
| discovery   | Entire module missing         | Create with clone/rate  |
| saved-scans | Missing clone, tags           | Add fields + endpoints  |

### Schema Gaps

| Model        | Gap                                            | Fix          |
| ------------ | ---------------------------------------------- | ------------ |
| SavedScan    | Missing: category, tags, cloneCount, avgRating | Add fields   |
| ScanCategory | Enum missing                                   | Create enum  |
| ScanRating   | Model missing                                  | Create model |
| AlertHistory | Model missing                                  | Create model |

### MCP Server Gaps

| Feature      | Gap             | Fix                    |
| ------------ | --------------- | ---------------------- |
| Aroon        | Not implemented | Add calculate_aroon()  |
| CCI          | Not implemented | Add calculate_cci()    |
| Pivot Points | Not implemented | Add calculate_pivots() |

---

## 7. Quick Wins (< 2 hours each)

1. **Add crossover operators to UI** - Just add 2 options to dropdown
2. **Add missing indicators to dropdown** - Update ATTRIBUTE_OPTIONS
3. **Fix home page** - Replace placeholder with redirect to /scans
4. **Add loading skeletons** - Use shadcn Skeleton component
5. **Update navigation** - Add links to all pages

---

## 8. Test Matrix

After fixes, verify these scans work:

| Scan                 | Filters                        | Expected Result     |
| -------------------- | ------------------------------ | ------------------- |
| RSI > 70             | RSI(14) > 70                   | Overbought stocks   |
| RSI crossed above 70 | RSI(14) crosses_above 70       | Entering overbought |
| Close > SMA(20)      | Close > SMA(close, 20)         | Above 20-day MA     |
| Golden Cross         | SMA(50) crosses_above SMA(200) | Bullish signal      |
| 52-week High         | High = Max(High, 252)          | At yearly high      |
| Gap Up 3%            | Open > (Close 1d ago \* 1.03)  | Gap up stocks       |
| Volume Spike         | Volume > (Volume 1d ago \* 2)  | 2x volume           |

---

_Gap Analysis completed: December 21, 2025_
