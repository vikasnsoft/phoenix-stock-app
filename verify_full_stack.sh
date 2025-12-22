#!/bin/bash
set -e

# Configuration
API_URL="http://localhost:4001/api"
SCAN_NAME="Integration Test Scan `date +%s`"

echo "========================================================"
echo "Starting Full Stack Verification (API + DB + MCP)"
echo "========================================================"

# 1. Create a Saved Scan
echo "[1/4] Creating Saved Scan: '$SCAN_NAME'..."
RESPONSE=$(curl -s -X POST "$API_URL/saved-scans" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'"$SCAN_NAME"'",
    "description": "Created by verify_full_stack.sh",
    "filters": [
      {
        "type": "price",
        "field": "close",
        "operator": "gt",
        "value": 150
      }
    ],
    "filterLogic": "AND",
    "symbols": ["AAPL", "MSFT"]
  }')

# Extract ID
SCAN_ID=$(echo $RESPONSE | jq -r '.data.id')

if [ "$SCAN_ID" == "null" ] || [ -z "$SCAN_ID" ]; then
  echo "Error: Failed to create scan. Response:"
  echo $RESPONSE
  exit 1
fi

echo "Success! Created Scan ID: $SCAN_ID"

# 2. Verify Persistence (List Scans)
echo "[2/4] Verifying Persistence (Listing Scans)..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/saved-scans")
FOUND=$(echo $LIST_RESPONSE | jq -r ".data.scans | to_entries[] | select(.value.id == \"$SCAN_ID\") | .value.id")

if [ "$FOUND" != "$SCAN_ID" ]; then
  echo "Error: Scan ID $SCAN_ID not found in list."
  exit 1
fi

echo "Success! Scan ID $SCAN_ID found in database."

# 3. Run the Saved Scan
echo "[3/4] Running Saved Scan..."
RUN_RESPONSE=$(curl -s -X POST "$API_URL/saved-scans/$SCAN_ID/run")

# Check if we got results
TOTAL_SCANNED=$(echo $RUN_RESPONSE | jq -r '.data.total_scanned')
MATCHED_COUNT=$(echo $RUN_RESPONSE | jq -r '.data.matched_count')

if [ "$TOTAL_SCANNED" == "null" ]; then
  echo "Error: Failed to run scan. Response:"
  echo $RUN_RESPONSE
  exit 1
fi

echo "Success! Execution completed. Scanned: $TOTAL_SCANNED, Matched: $MATCHED_COUNT"

# 4. Clean Up (Delete Scan)
echo "[4/4] Deleting Saved Scan..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/saved-scans/$SCAN_ID")
DELETED_ID=$(echo $DELETE_RESPONSE | jq -r '.data.id')

if [ "$DELETED_ID" != "$SCAN_ID" ]; then
  echo "Error: Failed to delete scan. Response:"
  echo $DELETE_RESPONSE
  exit 1
fi

echo "Success! Scan deleted."

echo "========================================================"
echo "Verification Complete! All systems operational."
echo "========================================================"
