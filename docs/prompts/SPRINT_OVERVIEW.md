# Sprint Overview & Status

Solo developer sprint plan for stock scanner MVP implementation.

## Sprint 1: Finnhub Foundation (2 weeks)

**Goal**: Migrate MCP engine to Finnhub, validate correctness

### Stories

| ID    | Story                              | Status         | Priority |
| ----- | ---------------------------------- | -------------- | -------- |
| E2-S1 | DataProvider abstraction           | ✅ Complete    | P0       |
| E2-S2 | FinnhubDataProvider implementation | ✅ Complete    | P0       |
| E2-S3 | Regression tests & rollout         | 🔄 In Progress | P0       |

**Definition of Done**:

- [ ] All scans use Finnhub via `FinnhubDataProvider`
- [ ] Regression script validates correctness
- [ ] Manual UI/API tests pass
- [ ] Dev environment stable on Finnhub

**Deliverables**:

- `apps/mcp-server/server.py` with provider abstraction
- `apps/mcp-server/regression_compare_providers.py`
- Updated README with data source docs

---

## Sprint 2: Expression Engine (2 weeks)

**Goal**: Enable AST-based expressions and simple grouped filters

### Stories

| ID    | Story                             | Status  | Priority |
| ----- | --------------------------------- | ------- | -------- |
| E1-S1 | Wire ExpressionNodeDto end-to-end | 📋 Todo | P0       |
| E1-S2 | AST evaluation in MCP             | 📋 Todo | P0       |
| E1-S3 | Grouped filters (thin slice)      | 📋 Todo | P1       |

**Definition of Done**:

- [ ] `ExpressionNodeDto` passes through Nest → MCP
- [ ] MCP can evaluate expressions like `Abs(Open - Close) < (High - Low) * 0.3`
- [ ] Nested AND/OR filters work (one level)
- [ ] Unit tests pass for AST evaluator

**Deliverables**:

- `apps/api/src/modules/common/filter-mapper.ts` (expression mapping)
- `apps/mcp-server/ast_evaluator.py` (new)
- `apps/mcp-server/test_ast_evaluator.py` (new)

---

## Sprint 3: Save/Load/Explain (2 weeks)

**Goal**: Scan versioning, Magic Filters, and Explain feature

### Stories

| ID    | Story                  | Status  | Priority |
| ----- | ---------------------- | ------- | -------- |
| E3-S1 | Magic Filters API      | 📋 Todo | P1       |
| E3-S2 | Magic Filters UI       | 📋 Todo | P1       |
| E3-S3 | Explain Scan API       | 📋 Todo | P1       |
| E4-S1 | SavedScanVersion model | 📋 Todo | P1       |
| E4-S2 | GET /saved-scans/:id   | 📋 Todo | P1       |
| E4-S3 | Edit in Builder        | 📋 Todo | P1       |

**Definition of Done**:

- [ ] SavedScans have immutable version history
- [ ] Magic Filters "Generate" button creates filters from text
- [ ] Explain API returns natural language for any scan
- [ ] Scans can be loaded into builder for editing

**Deliverables**:

- `SavedScanVersion` Prisma model + migration
- `POST /magic/scan-from-text` endpoint
- `POST /scan/explain` endpoint
- Updated ScanBuilder UI

---

## Sprint 4: Backtests & Alerts (2 weeks)

**Goal**: Run basic backtests and create scan-based alerts

### Stories

| ID    | Story                       | Status  | Priority |
| ----- | --------------------------- | ------- | -------- |
| E5-S1 | Backtest service/controller | 📋 Todo | P1       |
| E5-S2 | Backtest UI button          | 📋 Todo | P2       |
| E6-S1 | Alert → SavedScan linking   | 📋 Todo | P1       |
| E6-S2 | Alert scheduler worker      | 📋 Todo | P1       |
| E6-S3 | Create Alert UI             | 📋 Todo | P2       |

**Definition of Done**:

- [ ] Backtests run on historical data and return signals
- [ ] Alerts can be created from saved scans
- [ ] Alert scheduler evaluates scans daily
- [ ] UI buttons wired for both features

**Deliverables**:

- `BacktestsModule` with service/controller
- `AlertsModule` with scheduler
- Updated ScanBuilder with "Backtest" and "Create Alert" buttons

---

## Current Status

**Active Sprint**: Sprint 1  
**Current Story**: E2-S3 (Regression tests)  
**Completion**: 67% of Sprint 1 (2/3 stories done)

### Recent Completions

- ✅ `StockDataProvider` abstraction added
- ✅ `FinnhubDataProvider` implemented
- ✅ All scans now use Finnhub via Nest API
- ✅ TypeScript compile errors fixed (ExpressionNodeDto import)

### Next Up

1. **Complete Sprint 1**: Create `regression_compare_providers.py` and validate
2. **Start Sprint 2**: Wire `ExpressionNodeDto` through stack
3. **Build AST evaluator**: Core expression evaluation logic

---

## Velocity Tracking

**Sprint 1 (current)**:

- Started: [Date from your context]
- Target: 3 stories in 2 weeks
- Actual: 2 stories complete, 1 in progress

**Estimated remaining**:

- Sprint 1: 2-3 days
- Sprint 2: 10-14 days
- Sprint 3: 10-14 days
- Sprint 4: 10-14 days

**Total MVP timeline**: ~6-8 weeks (solo developer)

---

## Prompt Files Available

All prompts in `docs/prompts/`:

- ✅ Sprint 1: E2-S3 (regression tests)
- ✅ Sprint 2: E1-S1 (wire expression), E1-S2 (AST eval)
- ✅ Sprint 3: E4-S1 (versioning)
- ✅ Sprint 4: E5-S1 (backtests)
- 📋 Additional prompts: Create as needed per story

Use these prompts to guide implementation one story at a time.
