## MCP Server Structure Overview

An MCP server exposes three types of endpoints: **Tools** (executable functions), **Resources** (data providers), and **Prompts** (reusable templates). Here's the complete endpoint architecture for your stock screener.[^3][^1]

---

## Tools (Executable Functions)

Tools are invoked via `tools/call` requests and perform actions. These are the core scanning and analysis functions.[^1][^3]

### Data Fetching Tools

**`fetch_stock_data`**

- **Purpose**: Retrieve historical price/volume data from Alpha Vantage
- **Parameters**:
  - `symbol` (string, required): Stock ticker
  - `interval` (string): 'daily', 'weekly', 'monthly', '1min', '5min', '15min', '30min', '60min'
  - `outputsize` (string): 'compact' (100 points) or 'full' (20+ years)
- **Returns**: Time series data with OHLCV

**`get_technical_indicator`**

- **Purpose**: Calculate single technical indicator
- **Parameters**:
  - `symbol` (string, required)
  - `indicator` (string, required): 'RSI', 'MACD', 'SMA', 'EMA', 'BBANDS', 'ADX', 'ATR', 'STOCH', etc.
  - `interval` (string): Time interval
  - `time_period` (integer): Period for calculation (default: 14)
  - `series_type` (string): 'close', 'open', 'high', 'low'
- **Returns**: Indicator values over time

**`get_multiple_indicators`**

- **Purpose**: Batch fetch multiple indicators for efficiency
- **Parameters**:
  - `symbol` (string, required)
  - `indicators` (array of objects): Each with indicator name and parameters
  - `interval` (string)
- **Returns**: Object with all requested indicators

**`get_market_overview`**

- **Purpose**: Fetch broad market data (indices, sector performance)
- **Parameters**:
  - `market` (string): 'US', 'NSE', 'BSE'
  - `data_type` (string): 'indices', 'sectors', 'gainers', 'losers'
- **Returns**: Market-wide statistics

### Scanning Tools

**`scan_stocks`**

- **Purpose**: Core scanning engine - apply filters to stock list
- **Parameters**:
  - `symbols` (array of strings, required): List of tickers to scan
  - `filters` (array of filter objects, required): Each filter has:
    - `type`: 'technical', 'price', 'volume', 'crossover', 'pattern'
    - `indicator`: Indicator name (if technical)
    - `operator`: 'gt', 'lt', 'gte', 'lte', 'eq', 'crossed_above', 'crossed_below', 'between'
    - `value`: Comparison value or another indicator config
    - `offset`: Days ago (0=today, 1=yesterday)
    - `time_period`: Period for indicator calculation
  - `filter_logic` (string): 'AND' or 'OR'
  - `limit` (integer): Max results to return
- **Returns**: Array of stocks that pass filters with metadata

**`scan_with_expression`**

- **Purpose**: ChartInk-style expression scanner (e.g., "RSI(14) > 70 AND close crossed above SMA(20)")
- **Parameters**:
  - `symbols` (array of strings)
  - `expression` (string): Natural language or formula expression
  - `interval` (string)
- **Returns**: Matching stocks

**`run_preset_scan`**

- **Purpose**: Execute predefined popular scans
- **Parameters**:
  - `preset_name` (string): 'rsi_oversold', 'rsi_overbought', 'bullish_crossover', 'breakout_52week', 'high_volume', 'macd_bullish', 'bollinger_squeeze'
  - `symbols` (array of strings)
  - `custom_params` (object, optional): Override default parameters
- **Returns**: Scan results

**`backtest_scan`**

- **Purpose**: Test scan criteria against historical data
- **Parameters**:
  - `symbols` (array)
  - `filters` (array)
  - `start_date` (string)
  - `end_date` (string)
  - `interval` (string)
- **Returns**: Historical hit rate, performance metrics

### Pattern Recognition Tools

**`detect_chart_patterns`**

- **Purpose**: Identify technical patterns
- **Parameters**:
  - `symbol` (string)
  - `patterns` (array): 'head_and_shoulders', 'double_top', 'double_bottom', 'triangle', 'flag', 'wedge'
  - `lookback_period` (integer): Days to analyze
- **Returns**: Detected patterns with confidence scores

**`find_support_resistance`**

- **Purpose**: Calculate support/resistance levels
- **Parameters**:
  - `symbol` (string)
  - `lookback_period` (integer)
  - `method` (string): 'pivot_points', 'fibonacci', 'price_clusters'
- **Returns**: Support/resistance levels

### Watchlist Management Tools

**`create_watchlist`**

- **Purpose**: Create or update a watchlist
- **Parameters**:
  - `name` (string, required)
  - `symbols` (array of strings)
  - `description` (string, optional)
- **Returns**: Watchlist object with ID

**`add_to_watchlist`**

- **Purpose**: Add symbols to existing watchlist
- **Parameters**:
  - `watchlist_id` (string)
  - `symbols` (array)
- **Returns**: Updated watchlist

**`remove_from_watchlist`**

- **Purpose**: Remove symbols from watchlist
- **Parameters**:
  - `watchlist_id` (string)
  - `symbols` (array)
- **Returns**: Updated watchlist

**`delete_watchlist`**

- **Purpose**: Delete a watchlist
- **Parameters**:
  - `watchlist_id` (string)
- **Returns**: Confirmation

**`get_watchlist_scan_results`**

- **Purpose**: Run scan on specific watchlist
- **Parameters**:
  - `watchlist_id` (string)
  - `filters` (array)
- **Returns**: Scan results for watchlist stocks

### Analysis Tools

**`compare_stocks`**

- **Purpose**: Side-by-side comparison of multiple stocks
- **Parameters**:
  - `symbols` (array, 2-10 stocks)
  - `metrics` (array): Metrics to compare
  - `interval` (string)
- **Returns**: Comparison table

**`calculate_correlation`**

- **Purpose**: Calculate correlation between stocks/indicators
- **Parameters**:
  - `symbol1` (string)
  - `symbol2` (string)
  - `period` (integer)
- **Returns**: Correlation coefficient

**`get_stock_fundamentals`**

- **Purpose**: Fetch fundamental data (if available via Alpha Vantage)
- **Parameters**:
  - `symbol` (string)
  - `data_type` (string): 'overview', 'earnings', 'income_statement', 'balance_sheet'
- **Returns**: Fundamental data

### Alert \& Notification Tools

**`create_alert`**

- **Purpose**: Set up price/indicator alerts
- **Parameters**:
  - `symbol` (string)
  - `condition` (object): Alert condition
  - `notification_method` (string): 'email', 'webhook', 'sms'
- **Returns**: Alert ID

**`check_alerts`**

- **Purpose**: Check if any alerts triggered
- **Parameters**:
  - `user_id` (string)
- **Returns**: Triggered alerts

**`delete_alert`**

- **Purpose**: Remove an alert
- **Parameters**:
  - `alert_id` (string)
- **Returns**: Confirmation

### Export \& Sharing Tools

**`export_scan_results`**

- **Purpose**: Export results in various formats
- **Parameters**:
  - `scan_id` (string)
  - `format` (string): 'json', 'csv', 'excel'
- **Returns**: Download link or file data

**`share_scan_config`**

- **Purpose**: Generate shareable link for scan configuration
- **Parameters**:
  - `filters` (array)
  - `expiry_days` (integer)
- **Returns**: Shareable URL

---

## Resources (Data Providers)

Resources are accessed via `resources/list` and `resources/read` using URI patterns. These expose persistent data.[^3][^1]

### Watchlist Resources

**URI Pattern**: `watchlist://{watchlist_name}`

- **Example**: `watchlist://my-tech-stocks`
- **Returns**: List of symbols in watchlist with metadata

**URI Pattern**: `watchlist://{watchlist_name}/performance`

- **Example**: `watchlist://nifty50/performance`
- **Returns**: Aggregate performance metrics for watchlist

### Scan Configuration Resources

**URI Pattern**: `scan://config/{config_id}`

- **Example**: `scan://config/rsi-oversold-high-volume`
- **Returns**: Saved scan configuration (filters, parameters)

**URI Pattern**: `scan://history/{scan_id}`

- **Example**: `scan://history/2025-11-05-morning-scan`
- **Returns**: Historical scan results

**URI Pattern**: `scan://presets/{preset_name}`

- **Example**: `scan://presets/bullish_crossover`
- **Returns**: Preset scan configuration

### Market Data Resources

**URI Pattern**: `market://{market_name}/indices`

- **Example**: `market://NSE/indices`
- **Returns**: Current index values and changes

**URI Pattern**: `market://{market_name}/sectors`

- **Example**: `market://US/sectors`
- **Returns**: Sector performance data

**URI Pattern**: `market://{market_name}/movers`

- **Example**: `market://BSE/movers`
- **Returns**: Top gainers/losers

### Stock Data Resources

**URI Pattern**: `stock://{symbol}/snapshot`

- **Example**: `stock://RELIANCE.BSE/snapshot`
- **Returns**: Current price, volume, key indicators

**URI Pattern**: `stock://{symbol}/historical/{interval}`

- **Example**: `stock://TCS.NSE/historical/daily`
- **Returns**: Historical price data (cached)

**URI Pattern**: `stock://{symbol}/indicators/{indicator_name}`

- **Example**: `stock://INFY.BSE/indicators/RSI-14`
- **Returns**: Indicator values

### Pattern Library Resources

**URI Pattern**: `patterns://library/{pattern_type}`

- **Example**: `patterns://library/head_and_shoulders`
- **Returns**: Pattern definition and detection rules

**URI Pattern**: `patterns://detected/{symbol}`

- **Example**: `patterns://detected/AAPL`
- **Returns**: Recently detected patterns for symbol

### Documentation Resources

**URI Pattern**: `docs://indicators/{indicator_name}`

- **Example**: `docs://indicators/RSI`
- **Returns**: Indicator documentation, formula, interpretation

**URI Pattern**: `docs://scan-examples`

- **Returns**: Example scan configurations with explanations

---

## Prompts (Reusable Templates)

Prompts are accessed via `prompts/list` and `prompts/get`. These guide AI interactions.[^1][^3]

### Analysis Prompts

**`analyze_stock`**

- **Parameters**: `symbol`, `timeframe`, `analysis_type` ('technical', 'momentum', 'trend')
- **Template**: "Analyze {symbol} on {timeframe} timeframe using {analysis_type} analysis. Include key indicators (RSI, MACD, moving averages), support/resistance levels, and overall trend assessment."

**`compare_stocks_prompt`**

- **Parameters**: `symbols` (array), `criteria` (string)
- **Template**: "Compare the following stocks: {symbols} based on {criteria}. Provide relative strengths, weaknesses, and which might be better positioned."

**`explain_indicator`**

- **Parameters**: `indicator_name`, `symbol`, `current_value`
- **Template**: "Explain what the {indicator_name} value of {current_value} means for {symbol}. Include interpretation and potential trading signals."

### Scanning Prompts

**`create_scan_from_description`**

- **Parameters**: `user_description`
- **Template**: "Convert this scan description into technical criteria: '{user_description}'. Define the exact filters needed including indicators, operators, and threshold values."

**`explain_scan_results`**

- **Parameters**: `scan_config`, `results_count`
- **Template**: "Explain why these {results_count} stocks matched the scan criteria: {scan_config}. What market conditions favor this setup?"

**`suggest_scan_improvements`**

- **Parameters**: `current_scan`, `goal`
- **Template**: "Improve this scan configuration: {current_scan} to better achieve: {goal}. Suggest additional filters or parameter adjustments."

### Pattern Recognition Prompts

**`identify_pattern_opportunity`**

- **Parameters**: `symbol`, `detected_patterns`
- **Template**: "Based on detected patterns {detected_patterns} for {symbol}, identify potential trading opportunities, entry/exit points, and risk levels."

**`pattern_education`**

- **Parameters**: `pattern_name`
- **Template**: "Explain the {pattern_name} chart pattern including formation, psychology, typical price targets, and failure rates."

### Watchlist Prompts

**`analyze_watchlist`**

- **Parameters**: `watchlist_name`, `focus_area`
- **Template**: "Analyze my watchlist '{watchlist_name}' focusing on {focus_area}. Highlight top opportunities and stocks to watch."

**`suggest_watchlist_additions`**

- **Parameters**: `watchlist_name`, `current_symbols`, `criteria`
- **Template**: "Suggest additional stocks for my '{watchlist_name}' watchlist based on similarity to {current_symbols} and criteria: {criteria}."

### Strategy Prompts

**`backtest_strategy`**

- **Parameters**: `strategy_description`, `timeframe`
- **Template**: "Design a backtesting approach for this strategy: '{strategy_description}' over {timeframe}. Define entry/exit rules and metrics to track."

**`risk_assessment`**

- **Parameters**: `symbol`, `position_size`, `timeframe`
- **Template**: "Assess risk for entering {symbol} with position size {position_size} on {timeframe} timeframe. Consider volatility, support/resistance, and market conditions."

---

## Endpoint Discovery Schema

When clients call `tools/list`, `resources/list`, or `prompts/list`, your MCP server returns schemas defining all available endpoints:[^3][^1]

### Tools List Response Example

```json
{
  "tools": [
    {
      "name": "scan_stocks",
      "title": "Stock Scanner",
      "description": "Scan stocks using custom technical filters",
      "inputSchema": {
        "type": "object",
        "properties": {
          "symbols": { "type": "array", "items": { "type": "string" } },
          "filters": { "type": "array" },
          "filter_logic": { "type": "string", "enum": ["AND", "OR"] }
        },
        "required": ["symbols", "filters"]
      }
    }
  ]
}
```

### Resources List Response Example

```json
{
  "resources": [
    {
      "uri": "watchlist://tech-stocks",
      "name": "Tech Stocks Watchlist",
      "mimeType": "application/json",
      "description": "Technology sector stocks for monitoring"
    }
  ]
}
```

### Prompts List Response Example

```json
{
  "prompts": [
    {
      "name": "analyze_stock",
      "description": "Generate comprehensive stock analysis",
      "arguments": [
        { "name": "symbol", "required": true },
        { "name": "timeframe", "required": false }
      ]
    }
  ]
}
```

---

## Implementation Priority

For an MVP ChartInk clone, implement in this order:[^2][^4][^5]

**Phase 1 - Core Tools**:

1. `fetch_stock_data`
2. `get_technical_indicator`
3. `scan_stocks`
4. `run_preset_scan`

**Phase 2 - Watchlists**: 5. `create_watchlist`, `get_watchlist_scan_results` 6. Watchlist resources

**Phase 3 - Advanced**: 7. Pattern detection tools 8. Backtest tools 9. Alert system 10. Analysis prompts

**Phase 4 - Polish**: 11. Export/share tools 12. Full resource coverage 13. Complete prompt library

This endpoint structure gives you a production-ready MCP server architecture that replicates ChartInk's functionality while enabling AI-powered interactions through any MCP-compatible client like Windsurf, Claude Desktop, or Cursor.[^4][^2][^1][^3]
<span style="display:none">[^10][^11][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
[^2]: https://www.scalekit.com/blog/map-api-into-mcp-tool-definitions
[^3]: https://composio.dev/blog/how-to-effectively-use-prompts-resources-and-tools-in-mcp
[^4]: https://www.stainless.com/blog/from-api-to-mcp-a-practical-guide-for-developers
[^5]: https://composio.dev/blog/mcp-server-step-by-step-guide-to-building-from-scrtch
[^6]: https://modelcontextprotocol.io/docs/develop/build-server
[^7]: https://platform.openai.com/docs/mcp
[^8]: https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
[^9]: https://eodhd.com/financial-academy/fundamental-analysis-examples/how-to-build-custom-stock-screeners-with-eodhd-screener-api-in-python
[^10]: https://www.youtube.com/watch?v=oVKevwdOl4A
[^11]: https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
