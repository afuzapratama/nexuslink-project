#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting NexusLink API Server${NC}"
echo "=================================="
echo ""

cd /home/natama/Projects/nexuslink

echo "Checking prerequisites..."
echo "  ✓ DynamoDB should be running on port 8000"
echo "  ✓ Redis should be running on port 6379"
echo ""

echo -e "${GREEN}Starting API on port 8080...${NC}"
go run cmd/api/main.go
