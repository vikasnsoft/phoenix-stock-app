# Phoenix Stock Scanner - API Service

This is the centralized NestJS backend that bridges the Frontend (Web), the MCP Server (Python), and the Database (Prisma/PostgreSQL). It acts as the orchestration layer for the stock scanner platform.

## 🚀 Built Features

- **NestJS Architecture**: Structured, modular backend using NestJS best practices.
- **Modules**:
  - `ScansModule`: Handles scan execution, "parse natural language" proxying, and saved scans management.
  - `MarketDataModule`: Manages market data synchronization and storage.
  - `WatchlistsModule`: CRUD operations for user watchlists.
  - `SymbolsModule`: Manages the universe of stock symbols.
- **MCP Integration**:
  - Acts as a client to the Python MCP Server, executing tools like `parse_natural_language_query` via standard MCP protocols.
  - Proxies complex calculation requests to the Python engine.
- **Database Integration**:
  - Prisma ORM with PostgreSQL.
  - Schema definitions for `User`, `Watchlist`, `SavedScan`, `MarketData`, `FinancialMetric`.
- **Swagger/OpenAPI**:
  - Auto-generated API documentation at `/api`.
- **DTOs & Validation**:
  - Strict input validation using `class-validator` (e.g., `ParseNaturalLanguageQueryDto`, `CreateWatchlistDto`).

## ⏳ Pending / Future Work

- **Authentication & Authorization**: Currently open. Needs implementation of JWT-based auth (Passport/Guards) to secure user-specific data (watchlists, saved scans).
- **Rate Limiting**: Implementation of endpoints rate limiting (Throttler).
- **WebSockets**: Real-time push notifications for scan alerts or market data updates.
- **Deployment Configuration**: Dockerfile and production environment setup.

## 🛠 Usage

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Database Setup**:
    ```bash
    npx prisma generate
    npx prisma migrate dev
    ```
3.  **Run Server**:
    ```bash
    npm run start:dev
    ```
    The server runs on port `4001` by default.

## 📝 Configuration

- `DATABASE_URL`: Connection string for PostgreSQL.
- `API_PORT`: Port to run the server (default: `4001`).
- `WEB_APP_ORIGIN`: CORS origin for the frontend (default: `http://localhost:3000`).
