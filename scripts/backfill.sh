#!/bin/bash
#
# Backfill historical epoch data from Trillium API.
#
# Usage:
#   ./scripts/backfill.sh <base_url> <cron_secret> [from_epoch] [to_epoch] [batch_size]
#
# Example:
#   ./scripts/backfill.sh http://localhost:3000 your-secret-here 67 937 10
#   ./scripts/backfill.sh https://chainflow-dashboard.vercel.app your-secret-here
#
# The script calls the /api/backfill endpoint repeatedly until all epochs
# are backfilled. It waits between batches to avoid overwhelming Trillium.

BASE_URL="${1:?Usage: ./backfill.sh <base_url> <cron_secret> [from_epoch] [to_epoch] [batch_size]}"
CRON_SECRET="${2:?Please provide CRON_SECRET as second argument}"
FROM_EPOCH="${3:-67}"
TO_EPOCH="${4:-937}"
BATCH_SIZE="${5:-10}"

echo "═══════════════════════════════════════════════════"
echo "  Chainflow Dashboard — Historical Data Backfill"
echo "═══════════════════════════════════════════════════"
echo "  URL:        $BASE_URL"
echo "  Range:      Epoch $FROM_EPOCH → $TO_EPOCH"
echo "  Batch size: $BATCH_SIZE"
echo "═══════════════════════════════════════════════════"
echo ""

TOTAL_CALLS=0

while true; do
  TOTAL_CALLS=$((TOTAL_CALLS + 1))
  echo "▶ Batch #$TOTAL_CALLS — fetching..."

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$BASE_URL/api/backfill?from_epoch=$FROM_EPOCH&to_epoch=$TO_EPOCH&batch_size=$BATCH_SIZE")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" != "200" ]; then
    echo "  ✗ HTTP $HTTP_CODE — stopping"
    echo "  Response: $BODY"
    break
  fi

  # Parse key fields from JSON response
  REMAINING=$(echo "$BODY" | grep -o '"remaining":[0-9]*' | grep -o '[0-9]*')
  INSERTED=$(echo "$BODY" | grep -o '"inserted":[0-9]*' | grep -o '[0-9]*')
  EXISTING=$(echo "$BODY" | grep -o '"existingInDb":[0-9]*' | grep -o '[0-9]*')
  MESSAGE=$(echo "$BODY" | grep -o '"message":"[^"]*"' | head -1)

  echo "  ✓ Inserted: $INSERTED | In DB: $EXISTING | Remaining: $REMAINING"

  # Check if done
  if [ -z "$REMAINING" ] || [ "$REMAINING" = "0" ]; then
    if [ -n "$MESSAGE" ]; then
      echo ""
      echo "  $MESSAGE"
    fi
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "  ✓ Backfill complete! Total batches: $TOTAL_CALLS"
    echo "═══════════════════════════════════════════════════"
    break
  fi

  # Wait between batches (Trillium rate limiting)
  echo "  ⏳ Waiting 5s before next batch..."
  sleep 5
done