#!/bin/bash

echo "⚡ Testing Rate Limit..."
echo ""

SUCCESS=0
BLOCKED=0

for i in {1..65}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/r/test-rl 2>/dev/null)
  
  if [[ "$CODE" == "429" ]]; then
    BLOCKED=$((BLOCKED + 1))
    if [[ $BLOCKED -eq 1 ]]; then
      echo "  ⚠️  Rate limit triggered at request $i"
    fi
  else
    SUCCESS=$((SUCCESS + 1))
  fi
done

echo ""
echo "📊 Results:"
echo "  ✓ Allowed: $SUCCESS"
echo "  ✗ Blocked (429): $BLOCKED"
echo ""

if [[ $BLOCKED -gt 0 ]]; then
  echo "🎉 Rate limiting is working!"
else
  echo "⚠️  Rate limiting not triggered"
fi
