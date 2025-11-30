#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting NexusLink Agent${NC}"
echo "=================================="
echo ""

cd /home/natama/Projects/nexuslink

echo "Checking prerequisites..."
echo "  ✓ API should be running on port 8080"
echo "  ✓ Redis should be running on port 6379"
echo ""

echo -e "${GREEN}Starting Agent on port 9090...${NC}"
go run cmd/agent/main.go
