#!/bin/bash

echo "🚀 Generating Rate Limit Test Data"
echo "==================================="
echo ""

# Make 40 requests in background to trigger rate limiting
echo "Sending 40 requests to Agent..."
for i in {1..40}; do
  curl -s "http://localhost:9090/r/test-link-$((i % 5))" > /dev/null 2>&1 &
done

# Wait for all background jobs
wait

echo "✓ Requests completed"
echo ""
echo "Checking Redis..."

# Check Redis keys
KEYS=$(redis-cli -a devpass --no-auth-warning KEYS "ratelimit:*" 2>/dev/null)
COUNT=$(echo "$KEYS" | wc -l)

if [ $COUNT -gt 0 ]; then
  echo "✓ Found $COUNT rate limit keys:"
  echo "$KEYS"
else
  echo "⚠ No rate limit keys found"
fi

echo ""
echo "🌐 Refresh browser: http://localhost:3001/rate-limits"
