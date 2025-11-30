#!/bin/bash

# Simple rate limit test
echo "🧪 Testing Rate Limiting..."
echo ""

# Test with curl showing headers
echo "Making 62 rapid requests to /r/test-link..."
echo ""

success_count=0
rate_limited_count=0

for i in {1..62}; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -I http://localhost:9090/r/test-link 2>/dev/null)
  http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
  rate_limit=$(echo "$response" | grep -i "x-ratelimit-limit" | awk '{print $2}' | tr -d '\r')
  remaining=$(echo "$response" | grep -i "x-ratelimit-remaining" | awk '{print $2}' | tr -d '\r')
  
  if [ "$http_code" == "429" ]; then
    echo "❌ Request $i: HTTP 429 - Rate Limit Exceeded"
    rate_limited_count=$((rate_limited_count + 1))
  else
    echo "✓ Request $i: HTTP $http_code (Limit: $rate_limit, Remaining: $remaining)"
    success_count=$((success_count + 1))
  fi
done

echo ""
echo "📊 Results:"
echo "  Success: $success_count"
echo "  Rate Limited (429): $rate_limited_count"
echo ""
echo "Expected: ~60 success, ~2 rate limited (60 req/min limit)"
