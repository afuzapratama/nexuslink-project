#!/bin/bash

# Test rate limiting by making multiple requests
echo "Testing rate limiting (60 requests/minute per IP)..."
echo ""

# Make 65 requests rapidly
for i in {1..65}; do
  response=$(curl -s -w "\n%{http_code}\n%{header_json}" http://localhost:9090/r/test-link 2>/dev/null | tail -3)
  http_code=$(echo "$response" | sed -n '2p')
  
  # Extract rate limit headers from JSON
  headers=$(echo "$response" | sed -n '3p')
  rate_limit=$(echo "$headers" | grep -o '"x-ratelimit-limit":\["[0-9]*"\]' | grep -o '[0-9]*')
  rate_remaining=$(echo "$headers" | grep -o '"x-ratelimit-remaining":\["[0-9]*"\]' | grep -o '[0-9]*' | head -1)
  
  if [ "$http_code" == "429" ]; then
    echo "Request $i: HTTP $http_code - Rate limit exceeded! ⛔"
  elif [ "$http_code" == "404" ]; then
    echo "Request $i: HTTP $http_code - Link not found (remaining: $rate_remaining) ✓"
  else
    echo "Request $i: HTTP $http_code (remaining: $rate_remaining)"
  fi
  
  # Small delay to see the progression
  sleep 0.05
done

echo ""
echo "Test completed. Expected: first 60 requests OK, last 5 should be 429."
