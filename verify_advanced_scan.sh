#!/bin/bash

# Test Advanced Scan Features: Offset and Dynamic Indicator Value

echo "Testing Advanced Scan Features..."

# Payload: Close > SMA(20) with Offset 1 (Yesterday's Close > Yesterday's SMA(20))
PAYLOAD='{
  "symbols": ["AAPL", "MSFT"],
  "filterLogic": "AND",
  "filters": [
    {
      "type": "price",
      "field": "close",
      "operator": "gt",
      "value": {
        "type": "indicator",
        "field": "SMA",
        "time_period": 20
      },
      "offset": 1
    }
  ]
}'

echo "Sending payload: $PAYLOAD"

curl -X POST http://localhost:4001/api/scans/run \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -s | grep "matched_stocks"

if [ $? -eq 0 ]; then
  echo "✅ Advanced Scan Verification Passed!"
else
  echo "❌ Advanced Scan Verification Failed!"
fi
