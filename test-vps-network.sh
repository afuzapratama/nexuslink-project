#!/bin/bash

################################################################################
# VPS Network Connectivity Test
# Test apakah VPS bisa download Go dari berbagai mirror
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}VPS Network Connectivity Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Basic connectivity
echo -e "${YELLOW}[1/7] Testing basic connectivity...${NC}"
if ping -c 3 8.8.8.8 &> /dev/null; then
    echo -e "${GREEN}✅ Internet connection OK${NC}"
else
    echo -e "${RED}❌ No internet connection${NC}"
    exit 1
fi

# Test 2: DNS resolution
echo ""
echo -e "${YELLOW}[2/7] Testing DNS resolution...${NC}"
if nslookup go.dev &> /dev/null; then
    echo -e "${GREEN}✅ DNS resolution OK${NC}"
else
    echo -e "${RED}❌ DNS resolution failed${NC}"
fi

# Test 3: Check wget installation
echo ""
echo -e "${YELLOW}[3/7] Checking wget...${NC}"
if command -v wget &> /dev/null; then
    echo -e "${GREEN}✅ wget installed: $(wget --version | head -1)${NC}"
else
    echo -e "${RED}❌ wget not installed${NC}"
    echo -e "${BLUE}Installing wget...${NC}"
    apt-get update -qq && apt-get install -y wget -qq
fi

# Test 4: Check curl installation
echo ""
echo -e "${YELLOW}[4/7] Checking curl...${NC}"
if command -v curl &> /dev/null; then
    echo -e "${GREEN}✅ curl installed: $(curl --version | head -1)${NC}"
else
    echo -e "${RED}❌ curl not installed${NC}"
    echo -e "${BLUE}Installing curl...${NC}"
    apt-get update -qq && apt-get install -y curl -qq
fi

# Test 5: Test go.dev mirror
echo ""
echo -e "${YELLOW}[5/7] Testing go.dev mirror...${NC}"
START=$(date +%s)
if wget --spider --timeout=10 https://go.dev/dl/go1.23.3.linux-amd64.tar.gz 2>&1 | grep -q "200 OK"; then
    END=$(date +%s)
    DURATION=$((END - START))
    echo -e "${GREEN}✅ go.dev accessible (${DURATION}s)${NC}"
    GO_DEV_OK=true
else
    echo -e "${RED}❌ go.dev unreachable or blocked${NC}"
    GO_DEV_OK=false
fi

# Test 6: Test golang.google.cn mirror
echo ""
echo -e "${YELLOW}[6/7] Testing golang.google.cn mirror...${NC}"
START=$(date +%s)
if wget --spider --timeout=10 https://golang.google.cn/dl/go1.23.3.linux-amd64.tar.gz 2>&1 | grep -q "200 OK"; then
    END=$(date +%s)
    DURATION=$((END - START))
    echo -e "${GREEN}✅ golang.google.cn accessible (${DURATION}s)${NC}"
    GOOGLE_CN_OK=true
else
    echo -e "${RED}❌ golang.google.cn unreachable${NC}"
    GOOGLE_CN_OK=false
fi

# Test 7: Test GitHub mirror
echo ""
echo -e "${YELLOW}[7/7] Testing GitHub releases...${NC}"
START=$(date +%s)
if curl -s -I --max-time 10 https://github.com/golang/go/releases/download/go1.23.3/go1.23.3.linux-amd64.tar.gz | grep -q "302 Found"; then
    END=$(date +%s)
    DURATION=$((END - START))
    echo -e "${GREEN}✅ GitHub accessible (${DURATION}s)${NC}"
    GITHUB_OK=true
else
    echo -e "${RED}❌ GitHub unreachable${NC}"
    GITHUB_OK=false
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

if [ "$GO_DEV_OK" = true ] || [ "$GOOGLE_CN_OK" = true ] || [ "$GITHUB_OK" = true ]; then
    echo -e "${GREEN}✅ At least one mirror is working${NC}"
    echo ""
    echo -e "${YELLOW}Recommended mirror:${NC}"
    if [ "$GO_DEV_OK" = true ]; then
        echo -e "  ${GREEN}→ go.dev (fastest)${NC}"
    elif [ "$GOOGLE_CN_OK" = true ]; then
        echo -e "  ${GREEN}→ golang.google.cn${NC}"
    elif [ "$GITHUB_OK" = true ]; then
        echo -e "  ${GREEN}→ GitHub${NC}"
    fi
    echo ""
    echo -e "${BLUE}You can proceed with agent installation.${NC}"
else
    echo -e "${RED}❌ All mirrors are unreachable${NC}"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo -e "  1. Firewall blocking outbound HTTPS"
    echo -e "  2. VPS provider blocking certain domains"
    echo -e "  3. Network configuration issues"
    echo ""
    echo -e "${BLUE}Manual workaround:${NC}"
    echo -e "  1. Download Go on your local machine:"
    echo -e "     ${GREEN}wget https://go.dev/dl/go1.23.3.linux-amd64.tar.gz${NC}"
    echo -e "  2. Upload to VPS via SCP/SFTP"
    echo -e "  3. Extract manually:"
    echo -e "     ${GREEN}sudo tar -C /usr/local -xzf go1.23.3.linux-amd64.tar.gz${NC}"
    echo -e "     ${GREEN}export PATH=\$PATH:/usr/local/go/bin${NC}"
    echo -e "  4. Run installer with Go already installed"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Check if Go is already installed
echo ""
echo -e "${YELLOW}Checking existing Go installation...${NC}"
if command -v go &> /dev/null; then
    echo -e "${GREEN}✅ Go already installed: $(go version)${NC}"
    echo -e "${BLUE}No need to download, installer will skip Go installation.${NC}"
else
    echo -e "${YELLOW}ℹ️  Go not installed yet${NC}"
fi
