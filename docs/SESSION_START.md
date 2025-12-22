# Phoenix Stock Scanner - Session Start Context

**Date:** December 21, 2025
**Project Status:** Active Development - Phase 1 Complete (Core Logic & UI Foundation)

This document serves as a "context-loading" file for new AI sessions. It summarizes what has been built, the current architectural state, and pending tasks.

---

## 🏗 System Architecture

The project consists of three integrated applications:

1.  **`apps/mcp-server` (Python/FastMCP)**:

    - **Role**: The "Brain" and "Engine".
    - **Responsibilities**:
      - Exposes tools via Model Context Protocol (MCP).
      - Parses Natural Language queries into AST.
      - Calculates Technical Indicators (RSI, MACD, Ichimoku, etc.) using `pandas`.
      - Executes Scans based on complex filters.
      - Manages Redis Caching.
    - **Key Files**: `server.py`, `run_tool.py`.

2.  **`apps/api` (NestJS)**:

    - **Role**: The "Orchestrator" and "Gateway".
    - **Responsibilities**:
      - Centralized API for the frontend.
      - Proxies/Forwards request to MCP Server when needed.
      - Manages Database (Prisma/PostgreSQL) for Watchlists, Saved Scans, Users.
      - Validates Inputs (DTOs).
    - **Key Modules**: `ScansModule`, `WatchlistsModule`, `MarketDataModule`.

3.  **`apps/web` (Next.js/React)**:
    - **Role**: The "Interface".
    - **Responsibilities**:
      - Modern, unified UI for building scans.
      - **Magic Filters Panel**: NL-to-Filter interface.
      - **Inline Filter Editor**: Structured sentence-based editor.
      - State management via `Zustand`.
    - **Key Components**: `MagicFiltersPanel`, `InlineFilterEditor`, `FilterRow`.

---

## ✅ What We Built (Recent Highlights)

- **Unified UI Integration**:
  - Implemented `MagicFiltersPanel` that accepts natural language (e.g., "Bullish Engulfing on 5min").
  - Connected frontend to backend via `/api/scans/parse-nl`.
  - Fixed 500 errors by aligning Python return types (`Dict`) with MCP requirements.
- **Natural Language Logic**:
  - Backend `parse_natural_language_query` tool handles:
    - Operators (`>`, `<`, `crossed above`, `between`).
    - Indicators defined by text (`RSI 14`, `SMA 50`).
    - Presets (e.g., "Bullish" -> Price > SMA 50).
  - Compatibility layer ensures Python outputs match Frontend Types (`>` instead of `gt`).
- **Filter Logic Parity**:
  - Backend `evaluate_condition` updated to support both text (`gt`) and symbol (`>`) operators for robustness.

---

## ⏳ Pending / Next Tasks

1.  **Real-Time Data**:
    - Connect `mcp-server` to a live data source (Polygon/Finnhub) via WebSockets.
    - Push updates to frontend.
2.  **Authentication**:
    - Secure `apps/api` with JWT.
    - Add Login/Signup pages in `apps/web`.
3.  **Advanced Strategies**:
    - Implement "Strategy Backtesting" prompt/tool in MCP.
    - Add Pattern Recognition (Head & Shoulders, etc.) in backend.
4.  **Deployment**:
    - Dockerize all three apps.
    - Setup CI/CD.

---

## 📚 References & Rules

- **Rules**: See `docs/rules.md` (if exists) or `apps/web/src/lib/types/filter.types.ts` for the Source of Truth on Filter Structures.
- **Project Structure**:
  - `/apps` - Monorepo root for applications.
  - `/docs` - Documentation.
  - `/packages` - Shared libraries (currently empty/unused).

---

**Tip**: usage of `@` symbols in User Prompts (e.g. `@[apps]`) refers to filesystem locations.
