#!/bin/bash

echo "🧪 Rate Limit Test - Making 65 requests..."
echo ""

for i in {1..65}; do
  response=$(curl -s -w "\n%{http_code}" http://localhost:9090/r/test 2>/dev/null)
  http_code=$(echo "$response" | tail -1)
  
  if [ "$http_code" == "429" ]; then
    echo "❌ Request $i: HTTP 429 - RATE LIMITED"
  elif [ "$http_code" == "502" ] || [ "$http_code" == "404" ]; then
    echo "✓ Request $i: HTTP $http_code"
  else
    echo "Request $i: HTTP $http_code"
  fi
  sleep 0.01
done

echo ""
echo "✅ Test complete. Check if requests 61-65 got 429 status."
