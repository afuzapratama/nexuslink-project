#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting NexusLink Dashboard${NC}"
echo "=================================="
echo ""

cd /home/natama/Projects/nexuslink-dashboard

echo "Checking prerequisites..."
echo "  ✓ API should be running on port 8080"
echo ""

# Find available port
PORT=3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  Port 3000 is in use, trying 3001..."
  PORT=3001
fi

echo -e "${GREEN}Starting Dashboard on port $PORT...${NC}"
echo ""

PORT=$PORT npm run dev
