# PRD – Scanner & Screeners Module

## Overview

## Implementation Status

| Phase                             | Status         |
| --------------------------------- | -------------- |
| Phase 0: Filter UI Gaps           | ✅ Complete    |
| Phase 1: Core Infrastructure      | ✅ Complete    |
| Phase 2: Alerts & Notifications   | ✅ Complete    |
| Phase 3: Discovery & Community    | ✅ Complete    |
| Phase 4: Multi-Timeframe & Polish | 🚧 In Progress |

### Problem Statement

Active traders and investors in the Indian equity market need to efficiently filter thousands of stocks to find actionable opportunities based on technical and fundamental criteria. Existing solutions like Chartink offer powerful filter engines but suffer from steep learning curves, confusing syntax, delayed data during market hours, and limited onboarding—causing many users to abandon custom scan creation in favor of copying pre-built scans without understanding the underlying logic.

### Target Users

| Segment                      | Description                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Intraday Traders**         | Need real-time/near-real-time scans on 5-min/15-min timeframes to catch breakouts, VWAP crosses, and momentum shifts during market hours |
| **Swing/Positional Traders** | Scan daily/weekly charts for trend reversals, moving average crossovers, RSI extremes, and pattern setups                                |
| **Systematic Investors**     | Build and save repeatable scans for consistent stock discovery; may backtest or track scan performance over time                         |
| **Beginners**                | Want to learn technical screening via guided examples and educational content rather than raw filter syntax                              |

### Primary Value Proposition

A **powerful yet approachable** stock scanner that matches Chartink's filter depth while dramatically improving:

1. **Onboarding** – Guided scan builder with contextual education
2. **UX** – Visual filter groups, drag-and-drop reordering, live previews
3. **Alerts** – Reliable, timely notifications with clear throttling and channel options
4. **Community** – Curated public scans with ratings, explanations, and one-click cloning

### High-Level Goals

| Type         | Goal                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Business** | Become the go-to scanner for Indian retail traders; drive premium conversions via advanced alerts and intraday scans            |
| **User**     | Enable any trader—regardless of technical sophistication—to create, save, and act on custom scans within 5 minutes of first use |

---

## Context & Research Inputs

### Summary of Chartink's Screener & Scanner

Chartink provides a flexible, English-like syntax for building stock filters combining:

- **Attributes**: OHLCV (open, high, low, close, volume) with automatic offset prefixes
- **Indicators**: RSI, MACD, SMA, EMA, ADX, Supertrend, VWAP, Bollinger Bands, Aroon, ATR, CCI, Pivot Points
- **Fundamentals**: P/E, EPS, market cap, debt-to-equity, book value, dividend yield
- **Operations**: Arithmetic (+, −, ×, ÷), comparisons (>, <, =), crossovers (`crossed above`, `crossed below`)
- **Functional Filters**: `Min` / `Max` over a period (e.g., 52-week high = `max(high, 252)`)
- **Offsets**: `1 candle ago`, `1 day ago`, `latest` for time-shifted comparisons
- **Grouping**: AND/OR sub-filters for complex logic
- **Timeframes**: Daily, weekly, monthly, intraday (5-min, 15-min)
- **Segments**: Cash (NSE/BSE), F&O stocks, indices, user watchlists

### Key Insights from the Scanner User Guide

1. **Filter Syntax**: Filters follow a `<Measure> <Offset?> <Operation> <Value/Measure>` grammar. Offsets are auto-applied when selecting attributes.
2. **Crossover Logic**: Requires comparing two candles—e.g., "close 1 day ago < SMA(20) AND close > SMA(20)" for a bullish crossover.
3. **Min/Max Functions**: Accept two parameters—**Period** (number of candles) and **Measure** (attribute or indicator). Example: `max(high, 5) = high` finds stocks making a new 5-day high.
4. **Sub-Filters**: Added via a filter icon; combined with implicit AND or explicit OR.
5. **Arithmetic**: Enables percentage calculations—e.g., gap-up: `(open − close 1 day ago) / close 1 day ago * 100 > 2`.

### Key Insights from the Screeners Library

- **150,000+ public scans** organized by category (breakouts, oversold, candlestick patterns, fundamentals).
- Popular scans include "5-day higher high breakout," "RSI oversold bounce," "VWAP cross with volume spike."
- Users frequently clone and customize public scans rather than building from scratch.
- Scan sharing drives community engagement but lacks ratings, explanations, or performance metrics.

### Key Pain Points / Feature Requests (Inferred from Comments)

| Pain Point             | Description                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **Data Delays**        | 15–20 minute lag during live markets; past timestamps confuse users                                 |
| **Learning Curve**     | Syntax differences (`crossed above` vs. `greater than`) cause errors; offset logic is non-intuitive |
| **Missing Timeframes** | Requests for 30-min, hourly; inconsistent behavior across timeframes                                |
| **Segment Gaps**       | No BSE-only, index-only (not constituents), or futures-only filters                                 |
| **Indicator Gaps**     | No native RSI divergence, ZigZag (HH/HL detection), trendline breakouts                             |
| **Watchlist Limits**   | Max 10,000 stocks; no easy import/export                                                            |
| **Alert Reliability**  | Delayed or missed alerts; no throttling controls                                                    |
| **Educational Gaps**   | Guide explains syntax but not _why_ or _when_ to use specific patterns                              |

---

## User Personas

### Persona 1: Ravi – Active Intraday Trader

- **Profile**: 32 y/o full-time trader; trades NSE F&O stocks daily
- **Goals**: Catch opening-range breakouts, VWAP reclaims, volume spikes within first 30 minutes
- **Pains**: Current tools have 15-min delays; building intraday scans is confusing; misses opportunities while debugging filters
- **Sophistication**: High technical knowledge; wants power-user features but also speed

### Persona 2: Priya – Swing/Positional Trader

- **Profile**: 28 y/o IT professional; trades part-time on daily/weekly charts
- **Goals**: Find stocks with RSI divergence, golden cross setups, or near 52-week highs for 1–4 week holds
- **Pains**: Doesn't understand offset syntax; copies public scans but can't customize them; wants alerts for end-of-day triggers
- **Sophistication**: Intermediate; understands indicators conceptually but struggles with filter logic

### Persona 3: Arjun – Systematic/Backtest-Oriented Trader

- **Profile**: 35 y/o quantitative hobbyist; builds rule-based systems
- **Goals**: Create precise, reproducible scans; track historical performance; version control scan definitions
- **Pains**: No scan versioning; can't compare scan results over time; limited export options
- **Sophistication**: High; comfortable with code-like syntax but values documentation and auditability

---

## Core Use Cases

| #   | Use Case                                                                                                   | Primary Persona |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | **Create a custom scan** with indicators (RSI, MACD), price attributes, offsets, and arithmetic operations | Ravi, Arjun     |
| 2   | **Run a scan on different segments**: cash stocks, F&O universe, Nifty 50/100/500, user watchlists         | All             |
| 3   | **Discover and clone popular community scans** with one click; customize after cloning                     | Priya           |
| 4   | **Run scans on multiple timeframes**: daily (default), weekly, monthly, 5-min, 15-min                      | All             |
| 5   | **Set up alerts** when a scan's conditions are satisfied (email, push, in-app)                             | Priya, Ravi     |
| 6   | **Use Min/Max functional filters** for 52-week high/low, N-day breakout logic                              | Arjun           |
| 7   | **Combine filters with AND/OR grouping** for complex multi-condition scans                                 | Arjun, Ravi     |
| 8   | **View scan results with enriched data**: current price, change %, indicator values, mini-chart            | All             |
| 9   | **Save, edit, and version scans** with descriptive names and tags                                          | Arjun           |
| 10  | **Learn scanning concepts** via guided tooltips, example scans, and "Explain this filter" features         | Priya           |

---

## Scope

### In Scope (v1)

| Area                | Features                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Filter Engine**   | Attributes (OHLCV), 12+ indicators (RSI, MACD, SMA, EMA, Bollinger Bands, ADX, Supertrend, VWAP, ATR, Stochastic, Aroon, CCI), number constants, offsets (0–252 candles), arithmetic operations, comparisons, crossovers, Min/Max functions |
| **Grouping**        | AND/OR sub-filter groups with unlimited nesting depth (recommend max 3 levels in UI)                                                                                                                                                        |
| **Scan Management** | Create, save, edit, delete, clone/fork scans; tagging; basic version history (last 5 versions)                                                                                                                                              |
| **Discovery**       | "Top Scans" (by runs), "Most Cloned," "Recently Updated," category filters, search by name/tag                                                                                                                                              |
| **Execution**       | Daily + weekly + 15-min timeframes; segments: NSE cash, F&O stocks, Nifty 50/100/500, user watchlists                                                                                                                                       |
| **Alerts**          | Email + in-app notifications; trigger on scan match; throttle options (once per day, once per hour, every match)                                                                                                                            |
| **Data**            | EOD data (T+0 by 6 PM IST); intraday 15-min with ≤5-min delay during market hours                                                                                                                                                           |
| **Education**       | Contextual tooltips, "Explain this filter" button, 10 curated example scans with walkthroughs                                                                                                                                               |

### Out of Scope (v1)

| Feature                                        | Rationale                                      |
| ---------------------------------------------- | ---------------------------------------------- |
| Options chain scans (Greeks, OI, strike-level) | Requires separate data infrastructure          |
| Full backtesting engine with equity curves     | Significant complexity; planned for v2         |
| Strategy execution / auto-trading              | Regulatory and risk considerations             |
| BSE-only stocks                                | Data licensing; start with NSE                 |
| 5-min / 1-min intraday timeframes              | Infrastructure cost; start with 15-min         |
| RSI divergence / ZigZag indicators             | Custom indicator development; post-v1          |
| Mobile app                                     | Web-first; mobile-responsive v1, native app v2 |

---

## Functional Requirements

### FR – Filter Engine

| ID       | Requirement               | Behavior                                                                                    | Inputs                                                                 | Outputs                                                                   | Constraints                                                                                                                                                |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-FE-1  | **Attribute Selection**   | User selects a price/volume attribute (open, high, low, close, volume)                      | Dropdown selection                                                     | Attribute node added to filter                                            | —                                                                                                                                                          |
| FR-FE-2  | **Indicator Selection**   | User selects from 12+ indicators with configurable parameters                               | Dropdown + parameter inputs (e.g., RSI period = 14)                    | Indicator node added with defaults shown                                  | Default parameters: RSI(14), SMA(20), EMA(20), MACD(12,26,9), BBands(20,2), ADX(14), ATR(14), Supertrend(10,3), VWAP, Stochastic(14,3), Aroon(25), CCI(20) |
| FR-FE-3  | **Offset Configuration**  | User specifies temporal offset for any measure                                              | Offset selector: "Latest", "1 candle ago", "N candles ago" (N = 1–252) | Offset applied to measure                                                 | Offset 0 = latest; max offset = 252 (1 trading year)                                                                                                       |
| FR-FE-4  | **Comparison Operations** | User selects comparison: `>`, `>=`, `<`, `<=`, `=`, `≠`                                     | Dropdown                                                               | Comparison node                                                           | —                                                                                                                                                          |
| FR-FE-5  | **Crossover Operations**  | User selects `crossed above` or `crossed below`                                             | Dropdown                                                               | System auto-generates offset logic (compares current vs. previous candle) | Only valid between two measures (not constants)                                                                                                            |
| FR-FE-6  | **Arithmetic Operations** | User builds expressions: `A + B`, `A − B`, `A × B`, `A ÷ B`                                 | Expression builder UI                                                  | Computed measure node                                                     | Division by zero returns null (stock excluded from results)                                                                                                |
| FR-FE-7  | **Number Constants**      | User inputs static numeric values                                                           | Number input field                                                     | Constant node                                                             | Accept decimals up to 4 places                                                                                                                             |
| FR-FE-8  | **Min/Max Functions**     | User selects `Min` or `Max`, specifies Period (N candles) and Measure (attribute/indicator) | Function selector + Period input + Measure selector                    | Functional filter node                                                    | Period: 1–252; Measure: any attribute or indicator                                                                                                         |
| FR-FE-9  | **Fundamental Filters**   | User selects fundamental metric: P/E, EPS, Market Cap, Debt/Equity, Dividend Yield          | Dropdown + comparison + value                                          | Fundamental filter node                                                   | Data updated EOD only; sourced from exchange filings                                                                                                       |
| FR-FE-10 | **Filter Validation**     | System validates filter syntax before execution                                             | Filter definition                                                      | Valid/Invalid + error message                                             | Errors: missing operand, invalid offset, division by zero risk                                                                                             |

### FR – Scan Management

| ID      | Requirement         | Behavior                                                            | Inputs                                      | Outputs                                 | Constraints                                                        |
| ------- | ------------------- | ------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| FR-SM-1 | **Create Scan**     | User builds a new scan from scratch or from a template              | Filter definitions, name, description, tags | Saved scan object                       | Max 20 filters per scan; max 3 nesting levels for groups           |
| FR-SM-2 | **Save Scan**       | User saves scan with name, description, visibility (private/public) | Scan definition + metadata                  | Persisted scan with unique ID           | Name: 3–100 chars; Description: max 500 chars                      |
| FR-SM-3 | **Edit Scan**       | User modifies existing scan; system creates new version             | Updated filter definition                   | Updated scan; previous version archived | Last 5 versions retained                                           |
| FR-SM-4 | **Clone/Fork Scan** | User copies a public scan to their account for customization        | Source scan ID                              | New scan (private) linked to source     | Attribution shown: "Forked from [original]"                        |
| FR-SM-5 | **Delete Scan**     | User deletes own scan                                               | Scan ID                                     | Soft delete (recoverable 30 days)       | Cannot delete public scans with >100 clones (must unpublish first) |
| FR-SM-6 | **Tag Scans**       | User assigns up to 5 tags per scan                                  | Tag strings                                 | Tagged scan                             | Tags: alphanumeric, max 20 chars each                              |
| FR-SM-7 | **Version History** | User views past versions of a scan and can restore                  | Scan ID                                     | List of versions with timestamps        | Display diff between versions                                      |

### FR – Execution & Data

| ID      | Requirement                 | Behavior                                                                                        | Inputs                                                                                       | Outputs                                       | Constraints                                                           |
| ------- | --------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| FR-ED-1 | **Supported Instruments**   | Scans run on configurable universe                                                              | Segment selector: NSE Cash (all), F&O stocks, Nifty 50, Nifty 100, Nifty 500, User Watchlist | Filtered instrument list                      | NSE Cash: ~2,000 stocks; F&O: ~200; Nifty indices as specified        |
| FR-ED-2 | **Timeframe Selection**     | User selects scan timeframe                                                                     | Dropdown: Daily (default), Weekly, Monthly, 15-min                                           | Scan executes on selected timeframe's candles | Intraday (15-min) only available during market hours (9:15–15:30 IST) |
| FR-ED-3 | **EOD Data Freshness**      | Daily data updated by 6 PM IST                                                                  | —                                                                                            | Latest EOD candle                             | T+0 data; corporate actions adjusted                                  |
| FR-ED-4 | **Intraday Data Freshness** | 15-min candles updated with ≤5-min delay                                                        | —                                                                                            | Near-real-time candles                        | Delay displayed in UI: "Data as of HH:MM"                             |
| FR-ED-5 | **Scan Execution**          | System evaluates all filters against each instrument                                            | Scan definition + segment + timeframe                                                        | List of matching stocks with filter details   | Max execution time: 10 seconds for 2,000 stocks                       |
| FR-ED-6 | **Result Enrichment**       | Each matched stock includes: symbol, name, LTP, change %, volume, indicator values used in scan | Scan results                                                                                 | Enriched result rows                          | Include mini-sparkline for price (last 20 candles)                    |
| FR-ED-7 | **Watchlist Integration**   | User can run scans on custom watchlists                                                         | Watchlist ID                                                                                 | Scan runs only on watchlist symbols           | Max 500 symbols per watchlist for scan execution                      |

### FR – Discovery & Community

| ID      | Requirement                 | Behavior                                                                                 | Inputs                                                 | Outputs                            | Constraints                         |
| ------- | --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------- | ----------------------------------- |
| FR-DC-1 | **Browse Public Scans**     | User views paginated list of public scans                                                | Page number, sort order (popular, recent, most cloned) | List of public scans with metadata | 20 scans per page                   |
| FR-DC-2 | **Search Scans**            | User searches by name, description, or tags                                              | Search query                                           | Filtered scan list                 | Full-text search; min 2 characters  |
| FR-DC-3 | **Category Filters**        | User filters by category: Breakout, Reversal, Momentum, Volume, Candlestick, Fundamental | Category selector                                      | Filtered list                      | Categories assigned by scan creator |
| FR-DC-4 | **Scan Popularity Metrics** | Display run count, clone count, creator name                                             | —                                                      | Metrics on scan cards              | Updated hourly                      |
| FR-DC-5 | **Scan Ratings**            | Users rate public scans (1–5 stars)                                                      | Rating input                                           | Average rating displayed           | One rating per user per scan        |
| FR-DC-6 | **Featured Scans**          | Admin-curated "Staff Picks" section                                                      | Admin action                                           | Featured badge + top placement     | Max 10 featured scans               |

### FR – Alerts

| ID      | Requirement                | Behavior                                                                            | Inputs                                                                   | Outputs                                  | Constraints                                        |
| ------- | -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- | -------------------------------------------------- |
| FR-AL-1 | **Create Alert from Scan** | User enables alerts on a saved scan                                                 | Scan ID + delivery preferences                                           | Alert subscription created               | Max 10 active alerts per user (free); 50 (premium) |
| FR-AL-2 | **Delivery Channels**      | Alerts delivered via: Email, In-app notification, (future: Push, SMS)               | Channel selection                                                        | Alert sent to selected channels          | Email: max 1 per scan per hour; In-app: real-time  |
| FR-AL-3 | **Throttle Options**       | User configures alert frequency                                                     | Options: "Every match", "Once per hour", "Once per day", "Once per week" | Throttled alert delivery                 | Default: Once per day                              |
| FR-AL-4 | **Alert Content**          | Alert includes: scan name, matched stocks (top 10), timestamp, link to full results | —                                                                        | Formatted alert message                  | Truncate to 10 stocks; link to view all            |
| FR-AL-5 | **Alert History**          | User views past 30 days of alert triggers                                           | User ID                                                                  | List of triggered alerts with timestamps | Retention: 30 days                                 |
| FR-AL-6 | **Disable/Pause Alerts**   | User can pause or delete alert subscriptions                                        | Alert ID                                                                 | Alert status updated                     | Paused alerts don't trigger but retain config      |

---

## Non-Functional Requirements

| Category           | Requirement                          | Target                                                                        |
| ------------------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| **Performance**    | Scan execution time for 2,000 stocks | ≤10 seconds (p95)                                                             |
| **Performance**    | Page load time for scan builder      | ≤2 seconds                                                                    |
| **Reliability**    | Uptime for scan execution service    | 99.5% during market hours                                                     |
| **Data Freshness** | EOD data availability                | By 6:00 PM IST (T+0)                                                          |
| **Data Freshness** | Intraday (15-min) data delay         | ≤5 minutes during market hours                                                |
| **Scalability**    | Concurrent scan executions           | 500 simultaneous scans                                                        |
| **Security**       | Private scan access control          | Only owner can view/edit private scans                                        |
| **Security**       | Authentication                       | JWT-based auth; session timeout 24 hours                                      |
| **Observability**  | Scan execution logging               | Log every scan run: user, scan ID, segment, timeframe, duration, result count |
| **Observability**  | Error tracking                       | Alert on >1% scan failure rate                                                |

---

## UX & Flows

### Flow 1: Creating a New Scan from Scratch

```
1. User clicks "New Scan" → lands on Scan Builder page
2. **Step 1 – Choose Starting Point**
   - "Start from scratch" (default)
   - "Start from template" (shows 10 curated examples)
   - "Clone an existing scan"

3. **Step 2 – Add Filters** (visual builder)
   - Click "+ Add Condition"
   - **Left Side (Measure A)**:
     - Dropdown: Attribute (Close, Open, High, Low, Volume) OR Indicator (RSI, SMA, etc.)
     - If indicator: Show parameter inputs with defaults (e.g., RSI Period = 14)
     - Offset selector: "Latest" | "1 candle ago" | "N candles ago"
   - **Operator**:
     - Dropdown: ">", "<", "=", "crossed above", "crossed below"
   - **Right Side (Measure B or Value)**:
     - Toggle: "Compare to value" | "Compare to measure"
     - If value: Number input
     - If measure: Same selector as Left Side
   - **Live Preview**: "Close > SMA(20)" displayed in plain English

4. **Step 3 – Add More Conditions (optional)**
   - Click "+ Add Condition" again
   - Choose "AND" or "OR" to combine with previous
   - Support grouping: "( A AND B ) OR C" via drag-and-drop or group button

5. **Step 4 – Configure Execution**
   - Segment: Dropdown (NSE Cash, F&O, Nifty 50, etc.)
   - Timeframe: Dropdown (Daily, Weekly, 15-min)

6. **Step 5 – Run & Review**
   - Click "Run Scan"
   - Results table: Symbol, LTP, Change %, Volume, Filter Values, Mini-Chart
   - If 0 results: Show "No matches. Try adjusting filters." with suggestions

7. **Step 6 – Save**
   - Click "Save Scan"
   - Enter Name, Description, Tags, Visibility (Private/Public)
   - Confirm → Scan saved; redirect to "My Scans" or stay on builder
```

**UX Improvements over Chartink**:

- **Guided mode**: Default for new users; shows tooltips explaining each field
- **Plain-English preview**: Real-time sentence describing the filter logic
- **Inline education**: "?" icons link to indicator definitions
- **Error prevention**: Disable "Run" until filter is valid; show inline errors

---

### Flow 2: Cloning/Editing an Existing Scan

```
1. User browses "Discover" or "My Scans"
2. Clicks on a scan card → Scan Detail page
   - Shows: Name, Description, Creator, Run count, Clone count, Rating
   - Shows: Filter logic in visual tree format
   - "Run Now" button (executes immediately)
   - "Clone to My Scans" button (if public scan)
   - "Edit" button (if own scan)

3. **Clone Flow**:
   - Click "Clone" → Modal: "Clone as: [New Name]"
   - Confirm → Scan copied to My Scans (private)
   - Redirect to Scan Builder with cloned filters loaded
   - User can modify and save as new version

4. **Edit Flow (own scan)**:
   - Click "Edit" → Opens Scan Builder with existing filters
   - Make changes → Click "Save"
   - System creates new version; previous version accessible in "Version History"
```

---

### Flow 3: Browsing and Running Public Scans

```
1. User navigates to "Discover" tab
2. Sees:
   - **Search bar**: Search by name, tag, description
   - **Category tabs**: All | Breakout | Reversal | Momentum | Volume | Candlestick | Fundamental
   - **Sort dropdown**: Popular | Most Cloned | Newest | Highest Rated
   - **Featured section**: Staff Picks (top 10)

3. Scan cards show:
   - Name, Creator, ★ Rating, Runs, Clones
   - 1-line description
   - "Run" and "Clone" buttons

4. Click "Run" on a card:
   - Quick-run modal: Select Segment, Timeframe
   - Click "Execute" → Results overlay or redirect to results page

5. Click scan card (not button) → Full detail page (see Flow 2)
```

---

### Flow 4: Setting Up Alerts from a Scan

```
1. User opens a saved scan (own or cloned)
2. Clicks "🔔 Set Alert" button
3. **Alert Configuration Modal**:
   - **Trigger**: "When scan finds at least 1 match"
   - **Frequency**: Radio buttons
     - Every match (during market hours)
     - Once per hour
     - Once per day (default)
     - Once per week
   - **Channels**: Checkboxes
     - ✓ Email (default on)
     - ✓ In-app notification (default on)
   - **Active hours**: "Only during market hours (9:15–15:30 IST)" toggle

4. Click "Enable Alert" → Confirmation toast
5. Alert appears in "My Alerts" list with status indicator (Active/Paused)
6. User can pause, edit frequency, or delete from "My Alerts"
```

---

## Success Metrics

| Metric                        | Definition                                    | Target (6 months post-launch) |
| ----------------------------- | --------------------------------------------- | ----------------------------- |
| **Scans Created**             | # of saved scans per active user (monthly)    | ≥3                            |
| **Scan Runs**                 | % of DAU who run at least 1 scan              | ≥40%                          |
| **Alert Adoption**            | % of users with ≥1 active alert               | ≥25%                          |
| **Clone Rate**                | % of public scans cloned at least once        | ≥30%                          |
| **Retention (Scanner Users)** | 30-day retention of users who created ≥1 scan | ≥50%                          |
| **Time to First Scan**        | Median time from signup to first saved scan   | ≤10 minutes                   |
| **NPS (Scanner Feature)**     | Net Promoter Score for scanner module         | ≥40                           |

---

## Risks & Open Questions

### Risks

| Risk                              | Impact                                               | Mitigation                                                                                              |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Data licensing costs**          | High intraday data costs may limit refresh frequency | Start with 15-min (cheaper); negotiate bulk deals; consider freemium model (EOD free, intraday premium) |
| **Filter builder complexity**     | Users abandon scan creation due to confusion         | Invest in guided mode, templates, and inline education; A/B test simplified vs. advanced UI             |
| **Alert spam**                    | Users overwhelmed by too many alerts → disable all   | Default to "once per day"; require explicit opt-in for higher frequencies                               |
| **Performance at scale**          | Scan execution slows with more users                 | Pre-compute popular scans; cache indicator values; queue-based execution                                |
| **Chartink syntax compatibility** | Power users expect identical syntax                  | Document differences clearly; provide migration guide; do NOT aim for 100% parity                       |

### Open Questions

| Question                                                                         | Owner       | Decision Deadline          |
| -------------------------------------------------------------------------------- | ----------- | -------------------------- |
| Should we support importing Chartink scan syntax directly?                       | Product     | Before v1 beta             |
| What is the pricing tier for intraday scans and alerts?                          | Business    | Before public launch       |
| Do we need BSE data in v1, or can we defer to v1.1?                              | Product     | Before development kickoff |
| How do we handle scan results for indices (show index value vs. constituents)?   | Product     | Design phase               |
| What is our data vendor for 15-min candles? Finnhub, TrueData, or exchange feed? | Engineering | Before development kickoff |

---

## Appendix: Default Indicator Parameters (v1)

| Indicator       | Default Parameters               | Notes                    |
| --------------- | -------------------------------- | ------------------------ |
| RSI             | Period = 14                      | Standard                 |
| SMA             | Period = 20                      | Common for swing traders |
| EMA             | Period = 20                      | —                        |
| MACD            | Fast = 12, Slow = 26, Signal = 9 | Standard                 |
| Bollinger Bands | Period = 20, Std Dev = 2         | Standard                 |
| ADX             | Period = 14                      | —                        |
| ATR             | Period = 14                      | —                        |
| Supertrend      | Period = 10, Multiplier = 3      | Popular in India         |
| VWAP            | Intraday only                    | Resets daily             |
| Stochastic      | %K Period = 14, %D Smoothing = 3 | —                        |
| Aroon           | Period = 25                      | —                        |
| CCI             | Period = 20                      | —                        |

---

## Appendix: Example Curated Scans (v1 Templates)

| Name                            | Description                                      | Filters                                                                     |
| ------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| RSI Oversold Bounce             | Stocks with RSI below 30, price above 50-day SMA | RSI(14) < 30 AND Close > SMA(50)                                            |
| Golden Cross                    | 50-day SMA crosses above 200-day SMA             | SMA(50) crossed above SMA(200)                                              |
| Volume Breakout                 | Price up >3% with volume >2x 20-day average      | Close > Close[1] _ 1.03 AND Volume > SMA(Volume, 20) _ 2                    |
| 52-Week High Breakout           | Price within 2% of 52-week high                  | Close >= Max(High, 252) \* 0.98                                             |
| MACD Bullish Crossover          | MACD line crosses above signal line              | MACD crossed above MACD_Signal                                              |
| Supertrend Buy Signal           | Price crosses above Supertrend                   | Close crossed above Supertrend(10, 3)                                       |
| Opening Range Breakout (15-min) | Price breaks above first 15-min candle high      | Close > High[1] (on 15-min timeframe)                                       |
| Bullish Engulfing (Daily)       | Candlestick pattern detection                    | Close > Open AND Close[1] < Open[1] AND Close > Open[1] AND Open < Close[1] |
| High Dividend Yield             | Dividend yield >4%, P/E <20                      | Dividend_Yield > 4 AND PE_Ratio < 20                                        |
| Low Debt Growth Stock           | Debt/Equity <0.5, EPS growth >15%                | Debt_To_Equity < 0.5 AND EPS_Growth > 15                                    |

---

_End of PRD_
