# Phoenix Stock Scanner - MCP Server

This is the core Python backend for the Phoenix Stock Scanner, implemented as a Model Context Protocol (MCP) server using `fastmcp`. It handles data fetching, technical indicator calculations, and scan execution.

## 🚀 Built Features

- **FastMCP Server**: Implements the Model Context Protocol to expose stock market tools to AI agents and the API.
- **Core Tools**:
  - `list_watchlists`, `create_watchlist`, `update_watchlist_symbols`, `delete_watchlist`: Manage user watchlists.
  - `list_saved_scans`, `create_saved_scan`, `run_saved_scan`, `delete_saved_scan`: Manage and execute saved scan configurations.
  - `parse_natural_language_query`: Converts natural language (e.g., "RSI > 70") into structured filter JSON.
- **Technical Indicators**:
  - Robust implementation of common indicators using `pandas` and `numpy`.
  - Supported: SMA, EMA, RSI (Wilder's), MACD, Bollinger Bands, WMA, VWAP, ATR, ADX, Stochastic, Supertrend, Parabolic SAR, Ichimoku Cloud.
  - Supports dynamic parameters (e.g., `SMA(50)`, `RSI(20)`).
- **Scan Engine**:
  - Evaluates complex filter ASTs (Abstract Syntax Trees).
  - Supports logical operators (AND/OR), comparators (>, <, crosses_above, etc.), and arithmetic operations.
  - Multi-timeframe support (Daily, 5min, 15min, etc.).
- **Data & Caching**:
  - Redis caching layer for stock data, indicator results, and scan results.
  - Efficient data processing using Pandas DataFrames.

## ⏳ Pending / Future Work

- **Real-Time Data Integration**: Currently relies on local/mock data or basic fetching. Needs full integration with live websocket feeds or robust historical APIs (e.g. Finnhub full integration).
- **Advanced Strategies**: Implementation of more complex multi-step strategies involving pattern recognition (e.g. Head & Shoulders).
- **Unit Testing**: Comprehensive unit test suite for all indicator edge cases.
- **Performance Optimization**: Vectorizing more complex iterative indicators (like Supertrend) for speed at scale.

## 🛠 Usage

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Run Server**:
    ```bash
    python3 server.py
    ```
    The server typically runs on stdio or can be configured for SSE.

## 📝 Configuration

- `REDIS_URL`: URL for the Redis instance (default: `redis://localhost:6379/0`).
- `API_URL`: URL for the centralized NestJS API (default: `http://localhost:4001`).
