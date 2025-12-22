
import os
import logging
from server import _scan_stocks_core, _fetch_stock_data_core

# Configure logging to see output
logging.basicConfig(level=logging.INFO)

def test_fetch():
    symbol = "ZBRA"
    
    # Clear cache first
    try:
        from server import redis_client, CACHE_ENABLED
        if CACHE_ENABLED:
            key = f"stock:{symbol}:daily:compact"
            redis_client.delete(key)
            print(f"Cleared cache for {key}")
    except Exception as e:
        print(f"Failed to clear cache: {e}")

    print(f"Testing fetch for {symbol}...")
    try:
        data = _fetch_stock_data_core(symbol, "daily", "compact")
        if data.get('data'):
            print(f"SUCCESS: Fetched {len(data['data'])} candles for {symbol}")
            print(f"Source: {data.get('data')[0]}")
        else:
            print(f"FAILURE: No data returned for {symbol}")
            print(f"Raw response: {data}")
    except Exception as e:
        print(f"ERROR: {e}")

def test_scan():
    symbol = "ZBRA"
    print(f"\nTesting scan for {symbol}...")
    filters = [{"type": "price", "field": "close", "operator": "gt", "value": 0}]
    
    result = _scan_stocks_core([symbol], filters)
    
    print(f"Total Scanned: {result['total_scanned']}")
    print(f"Matched: {len(result['matched_stocks'])}")
    print(f"Failed: {len(result.get('failed_stocks', []))}")
    
    if result.get('failed_stocks'):
        print(f"Failures: {result['failed_stocks']}")

if __name__ == "__main__":
    test_fetch()
    test_scan()
