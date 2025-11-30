#!/bin/bash

# Clear all data from DynamoDB tables and Redis
echo "🗑️  Clearing all data from DynamoDB and Redis..."
echo ""

REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"

# Clear Redis first
echo "🔴 Clearing Redis data..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FLUSHALL > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✓ Redis cleared successfully"
else
  echo "   ⚠ Warning: Could not clear Redis (redis-cli not found or Redis not running)"
fi

echo ""
echo "📦 Clearing DynamoDB tables..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Run Go script to clear DynamoDB
cd "$PROJECT_DIR" && go run -mod=mod scripts/clear_db.go

echo ""
echo "✅ All data cleared successfully!"
