# E2-S3: Regression Tests & Rollout

**Epic**: Finnhub-Backed Scan Data Pipeline  
**Sprint**: 1  
**Status**: Pending (E2-S1 and E2-S2 complete)  
**Priority**: P0 (Must for MVP)

## Goal

Create simple regression tests to compare scan behavior and safely enable Finnhub as the default data source in production.

## Context

- `FinnhubDataProvider` is now implemented in `apps/mcp-server/server.py`
- All scans currently use Finnhub via `STOCK_DATA_PROVIDER = FinnhubDataProvider()`
- Need to validate correctness before full prod rollout

## Technical Requirements

### 1. Create Regression Script

**File**: `apps/mcp-server/regression_compare_providers.py`

**Requirements**:

- Test 3-5 symbols: `["AAPL", "MSFT", "NVDA"]`
- Test 2-3 simple filters:
  - Price filter: `close > 100`
  - RSI filter: `RSI > 70`
  - SMA cross: `close > SMA(20)`
- Run scans via the existing `scan_stocks` tool
- Compare results:
  - Total scanned vs total matched
  - Per-symbol indicator values (within ±2% tolerance)
- Output summary to console

**Implementation hints**:

```python
#!/usr/bin/env python3
import sys
sys.path.append('.')
from server import scan_stocks, get_technical_indicator

def run_regression():
    symbols = ["AAPL", "MSFT", "NVDA"]

    # Test case 1: Simple price filter
    filters = [{"type": "price", "field": "close", "operator": "gt", "value": 100}]
    result = scan_stocks(symbols, filters, "AND")

    print(f"✓ Price filter test: {result['total_matched']}/{result['total_scanned']} matched")

    # Test case 2: RSI filter
    filters = [{"type": "indicator", "field": "RSI", "operator": "gt", "value": 70, "time_period": 14}]
    result = scan_stocks(symbols, filters, "AND")

    print(f"✓ RSI filter test: {result['total_matched']}/{result['total_scanned']} matched")

    # Additional assertions...

if __name__ == "__main__":
    run_regression()
```

### 2. Manual Validation

**Via UI** (`apps/web`):

- Navigate to `/scans`
- Create a simple scan (e.g., "Close > 150")
- Run on 5-10 symbols
- Verify results match expectations from TradingView/Finnhub charts

**Via API** (Nest):

- `POST /api/scans/run` with sample payload
- Check response structure unchanged
- Verify indicator values

### 3. Documentation Updates

**File**: `apps/mcp-server/README.md`

Add section:

````markdown
## Data Provider Configuration

The MCP server uses Finnhub as the primary data source via the NestJS API.

- OHLC data is fetched from `/api/market-data/candles` (Finnhub-backed)
- Indicators are calculated locally from Finnhub candles
- Results are cached in Redis (TTL: 1 hour for OHLC, 30 min for indicators)

### Testing

Run regression tests:

```bash
cd apps/mcp-server
source venv/bin/activate
python regression_compare_providers.py
```
````

````

## Files to Create/Modify

- **Create**: `apps/mcp-server/regression_compare_providers.py`
- **Update**: `apps/mcp-server/README.md` (add data provider docs)
- **Update**: `apps/mcp-server/.env.example` (document any new env vars)

## Acceptance Criteria

- [ ] Regression script runs successfully
- [ ] All test cases pass with <2% indicator value variance
- [ ] Manual UI scan produces expected results
- [ ] API `/scans/run` responses unchanged in structure
- [ ] Performance: 10 symbols scan completes in <10 seconds
- [ ] Documentation updated

## Testing Steps

1. **Run regression script**:
   ```bash
   cd apps/mcp-server
   source venv/bin/activate
   python regression_compare_providers.py
````

2. **Manual scan via UI**:

   - Start Nest: `cd apps/api && npm run start:dev`
   - Start web: `cd apps/web && npm run dev`
   - Navigate to `http://localhost:3000/scans`
   - Create scan: "Price > 100"
   - Run on ["AAPL", "MSFT", "GOOGL"]
   - Verify results

3. **API test via Postman/curl**:
   ```bash
   curl -X POST http://localhost:4001/api/scans/run \
     -H "Content-Type: application/json" \
     -d '{
       "symbols": ["AAPL"],
       "filters": [{"type": "price", "field": "close", "operator": "gt", "value": 100}],
       "filterLogic": "AND"
     }'
   ```

## Rollout Plan

1. **Dev**: Already using Finnhub (current state)
2. **Staging**: Deploy and run regression for 2-3 days
3. **Prod**:
   - Deploy during low-traffic window
   - Monitor error logs for Finnhub 429s
   - Have rollback plan (revert provider if needed)

## Dependencies

- E2-S1: DataProvider abstraction (✓ Complete)
- E2-S2: FinnhubDataProvider implementation (✓ Complete)

## Notes

- Finnhub free tier: 60 calls/min
- Nest API caches responses (5 min TTL)
- MCP caches stock data (1 hour TTL)
- Rate limiting should not be an issue for typical scan volumes
