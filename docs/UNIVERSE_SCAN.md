# Universe-Wide Scanning

The stock scanner supports scanning the **entire available stock universe** without specifying individual symbols.

## How It Works

### Backend (MCP Server)

When no symbols are provided to the scan engine:

```python
# In apps/mcp-server/server.py
def _scan_stocks_core(
    symbols: List[str],
    filters: List[Dict[str, Any]],
    filter_logic: str = "AND"
) -> Dict[str, Any]:
    # If no symbols provided, fetch universe from API
    if not symbols:
        logger.info("No symbols provided, fetching full universe from API...")
        universe = _fetch_stock_universe_from_api()
        symbols = [s['ticker'] for s in universe]
        logger.info(f"Fetched {len(symbols)} symbols from universe")

    # ... scan logic continues
```

The system automatically:

1. Calls `GET /api/symbols` to fetch all available symbols
2. Runs the scan across all retrieved symbols
3. Returns matched stocks

### API Layer (NestJS)

The `RunScanDto` makes symbols optional:

```typescript
export class RunScanDto {
  @ApiPropertyOptional({
    description: "Symbols to scan (empty = full universe)",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  public readonly symbols?: string[];

  @ApiProperty({ type: () => [FilterConditionDto] })
  @IsArray()
  @ArrayNotEmpty()
  public readonly filters!: FilterConditionDto[];

  @ApiPropertyOptional({ enum: FilterLogic })
  @IsOptional()
  public readonly filterLogic?: FilterLogic;
}
```

### Frontend (Next.js)

The Scan Builder UI:

- Symbols input field is **optional** (can be left blank)
- Displays hint: "Leave symbols empty to scan entire universe"
- When empty, sends `symbols: undefined` to API
- Form validates even with no symbols

```typescript
const payload: RunScanDto = {
  symbols: symbols.length > 0 ? symbols : undefined,
  filters: filters.map(mapFilterToApi),
  filterLogic: filterLogic,
};
```

## Usage Examples

### Via UI

1. Navigate to `/scans`
2. Leave symbol field **empty**
3. Add filters (e.g., "Close > 100")
4. Click "Run Scan"
5. System scans all available stocks

### Via API

**Scan entire universe**:

```bash
curl -X POST http://localhost:4001/api/scans/run \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"type": "price", "field": "close", "operator": "gt", "value": 100}
    ],
    "filterLogic": "AND"
  }'
```

**Scan specific symbols**:

```bash
curl -X POST http://localhost:4001/api/scans/run \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "MSFT", "GOOGL"],
    "filters": [
      {"type": "indicator", "field": "RSI", "operator": "gt", "value": 70, "timePeriod": 14}
    ],
    "filterLogic": "AND"
  }'
```

## Symbol Universe Source

The universe is fetched from:

- **Route**: `GET /api/symbols`
- **Service**: `SymbolsService.findAll()`
- **Database**: Prisma `Symbol` table
- **Source**: Synchronized from Finnhub via `syncFromFinnhub(exchange)`

### Populating the Universe

To ensure stocks are available for scanning:

```bash
# Via API endpoint
curl -X POST http://localhost:4001/api/symbols/sync?exchange=US

# Or via NestJS service
await symbolsService.syncFromFinnhub('US');
```

This fetches all symbols from Finnhub for the specified exchange and stores them locally.

## Performance Considerations

### Full Universe Scans

- **US Market**: ~5,000-8,000 symbols
- **Scan time**: Depends on:
  - Number of filters
  - Filter complexity
  - Cached vs fresh data
  - Finnhub rate limits (60 calls/min on free tier)

**Estimated times**:

- Simple price filter: 2-5 minutes
- Complex indicator filter: 5-15 minutes
- Multiple filters: 10-30 minutes

### Optimization Strategies

1. **Caching**: Stock data and indicators are cached (Redis/in-memory)
2. **Batch Processing**: Symbols processed sequentially to respect rate limits
3. **Pre-filtering**: Apply simple filters first to reduce dataset
4. **Symbol Segments**: Filter universe by exchange, sector, or market cap before scanning

### Recommended Workflow

For large universe scans:

1. **Start narrow**: Test filters on 5-10 symbols first
2. **Validate logic**: Ensure filters produce expected results
3. **Scale up**: Run on 50-100 symbols
4. **Full scan**: Only run universe-wide when confident in filters

## Error Handling

The system gracefully handles:

- **Empty universe**: Returns zero matches if no symbols available
- **API failures**: Logs error, continues with partial results
- **Rate limits**: Respects Finnhub 429 responses
- **Timeout**: Each symbol has timeout protection

## Future Enhancements

Planned improvements for universe scanning:

- [ ] Parallel symbol processing (respecting rate limits)
- [ ] Progressive results streaming (show matches as they're found)
- [ ] Smart pre-filtering (exclude low-volume/inactive stocks)
- [ ] Exchange/sector selection in UI
- [ ] Estimated time display before scan
- [ ] Pause/resume capability for long scans
- [ ] Background job queue for large scans

## Related Files

- `apps/mcp-server/server.py` - `_scan_stocks_core()`, `_fetch_stock_universe_from_api()`
- `apps/api/src/modules/scans/dto/run-scan.dto.ts` - Optional symbols DTO
- `apps/api/src/modules/symbols/symbols.service.ts` - Universe fetching
- `apps/web/src/features/scans/scan-builder.tsx` - UI implementation
