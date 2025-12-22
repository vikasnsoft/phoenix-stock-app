# Implementation Prompts

This directory contains structured prompts for implementing the stock scanner MVP features.

## Organization

Prompts are organized by sprint and epic:

```
docs/prompts/
├── README.md (this file)
├── sprint-1/
│   └── E2-S3-regression-tests.md
├── sprint-2/
│   ├── E1-S1-wire-expression-dto.md
│   ├── E1-S2-ast-evaluation.md
│   └── E1-S3-grouped-filters.md (TODO)
├── sprint-3/
│   ├── E3-S1-magic-filters-api.md (TODO)
│   ├── E3-S2-magic-filters-ui.md (TODO)
│   ├── E3-S3-explain-scan-api.md (TODO)
│   ├── E4-S1-scan-versioning.md (TODO)
│   ├── E4-S2-get-scan-by-id.md (TODO)
│   └── E4-S3-edit-in-builder.md (TODO)
└── sprint-4/
    ├── E5-S1-backtest-service.md (TODO)
    ├── E6-S1-alert-linking.md (TODO)
    └── E6-S2-alert-scheduler.md (TODO)
```

## How to Use These Prompts

Each prompt file contains:

- **Goal**: What you're building
- **Context**: Background and current state
- **Technical Requirements**: Detailed implementation steps
- **Files to Create/Modify**: Exact file paths
- **Acceptance Criteria**: Definition of done
- **Testing Steps**: How to verify it works
- **Dependencies**: What must be done first
- **Next Steps**: What comes after

### Workflow

1. **Pick a story** from the current sprint
2. **Read the prompt file** completely
3. **Check dependencies** - ensure prior stories are complete
4. **Follow technical requirements** section by section
5. **Run tests** from the testing steps
6. **Mark story as done** when all acceptance criteria pass

## Completed Stories

- ✅ **E2-S1**: DataProvider abstraction (Sprint 1)
- ✅ **E2-S2**: FinnhubDataProvider implementation (Sprint 1)

## Current Sprint: Sprint 1

### Active Story

- 🔄 **E2-S3**: Regression tests & rollout

### Up Next (Sprint 2)

- **E1-S1**: Wire ExpressionNodeDto end-to-end
- **E1-S2**: AST evaluation in MCP

## Epic Reference

### Epic 1: Expression/Filter Engine

- E1-S1: Wire ExpressionNodeDto
- E1-S2: AST evaluation
- E1-S3: Grouped filters
- E1-S4: Min/Max functions

### Epic 2: Finnhub Pipeline

- ✅ E2-S1: DataProvider abstraction
- ✅ E2-S2: Finnhub provider
- E2-S3: Regression tests

### Epic 3: Magic Filters & Explain

- E3-S1: Magic Filters API
- E3-S2: Magic Filters UI
- E3-S3: Explain Scan API
- E3-S4: Explain UI

### Epic 4: Save/Load/Version

- E4-S1: SavedScanVersion model
- E4-S2: GET /saved-scans/:id
- E4-S3: Edit in Builder

### Epic 5: Backtesting

- E5-S1: Backtest service
- E5-S2: Backtest UI

### Epic 6: Alerts

- E6-S1: Alert → SavedScan linking
- E6-S2: Alert scheduler worker
- E6-S3: Alert UI

### Epic 7: Integration

- E7-S1: Watchlist scan UX

## Contributing New Prompts

When creating a new prompt file:

1. Use the template structure from existing prompts
2. Include concrete code examples
3. List all files with absolute paths
4. Add specific test commands
5. Link dependencies clearly
6. Keep acceptance criteria measurable

## Notes

- All prompts assume you're working from the repo root: `/Users/vikas/Projects/nSoft/stock-scanner-mcp-server`
- Backend is NestJS (TypeScript) at `apps/api`
- Frontend is Next.js at `apps/web`
- MCP server is Python at `apps/mcp-server`
- Follow `.windsurf/rules` for code style (NestJS + full-stack standards)
