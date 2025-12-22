#!/bin/bash

# Test Finnhub Integration: Universe, Data, and Caching

echo "Testing Finnhub Integration..."

# 0. Sync Symbols (if needed)
echo "0. Syncing symbols (US)..."
curl -s -X POST http://localhost:4001/api/symbols/sync/US

# 1. Test Stock Universe Fetching (via Scan with empty symbols)
echo "1. Testing fetch_stock_universe (via Scan)..."
# We'll use a simple filter that should pass for most stocks (e.g. price > 0)
# But to avoid scanning 1000s of stocks which takes time, we might want to mock or just check if it starts scanning.
# However, for verification, let's just check if it returns ANY data without error.
SCAN_RESPONSE=$(curl -s -X POST http://localhost:4001/api/scans/run \
  -H "Content-Type: application/json" \
  -d '{
  "filterLogic": "AND",
  "filters": [
    {
      "type": "price",
      "field": "close",
      "operator": "gt",
      "value": 0
    }
  ]
}')

# Check if response contains "total_scanned" > 0
if echo "$SCAN_RESPONSE" | grep -q '"total_scanned":[1-9]'; then
  echo "✅ fetch_stock_universe passed (Scanned multiple stocks)"
else
  echo "❌ fetch_stock_universe failed"
  echo "$SCAN_RESPONSE"
fi

# 2. Test Stock Data Fetching & Caching (via Scan with single symbol)
echo "2. Testing fetch_stock_data (First Call - Cache Miss)..."
START_TIME=$(date +%s%N)
DATA_RESPONSE_1=$(curl -s -X POST http://localhost:4001/api/scans/run \
  -H "Content-Type: application/json" \
  -d '{
  "symbols": ["AAPL"],
  "filterLogic": "AND",
  "filters": [
    {
      "type": "price",
      "field": "close",
      "operator": "gt",
      "value": 0
    }
  ]
}')
END_TIME=$(date +%s%N)
DURATION_1=$((($END_TIME - $START_TIME)/1000000))
echo "First call took ${DURATION_1}ms"

if echo "$DATA_RESPONSE_1" | grep -q "matched_stocks"; then
  echo "✅ fetch_stock_data passed (Data returned)"
else
  echo "❌ fetch_stock_data failed"
  echo "$DATA_RESPONSE_1"
fi

echo "3. Testing fetch_stock_data (Second Call - Cache Hit)..."
START_TIME=$(date +%s%N)
DATA_RESPONSE_2=$(curl -s -X POST http://localhost:4001/api/scans/run \
  -H "Content-Type: application/json" \
  -d '{
  "symbols": ["AAPL"],
  "filterLogic": "AND",
  "filters": [
    {
      "type": "price",
      "field": "close",
      "operator": "gt",
      "value": 0
    }
  ]
}')
END_TIME=$(date +%s%N)
DURATION_2=$((($END_TIME - $START_TIME)/1000000))
echo "Second call took ${DURATION_2}ms"

if echo "$DATA_RESPONSE_2" | grep -q "matched_stocks"; then
  echo "✅ fetch_stock_data cache test passed (Data returned)"
else
  echo "❌ fetch_stock_data cache test failed"
fi
