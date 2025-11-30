#!/bin/bash
#
# NexusLink DynamoDB Restore Script
# Restore tables from on-demand backup
#
# Usage: bash restore-dynamodb.sh <backup-arn> <target-table-name>
# Example: bash restore-dynamodb.sh arn:aws:dynamodb:... NexusLinks
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
AWS_REGION="${NEXUS_AWS_REGION:-ap-southeast-1}"

echo -e "${GREEN}♻️  NexusLink DynamoDB Restore${NC}"
echo "----------------------------------------"

# Check arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <backup-arn> [target-table-name]"
    echo ""
    echo "To list available backups:"
    echo "  aws dynamodb list-backups --region $AWS_REGION"
    exit 1
fi

BACKUP_ARN=$1
TARGET_TABLE=${2:-}

# Extract table name from backup ARN if not provided
if [ -z "$TARGET_TABLE" ]; then
    TARGET_TABLE=$(echo "$BACKUP_ARN" | grep -oP 'table/\K[^/]+' | head -1)
    TARGET_TABLE="${TARGET_TABLE}-restored-$(date +%Y%m%d-%H%M%S)"
fi

echo "Backup ARN: $BACKUP_ARN"
echo "Target Table: $TARGET_TABLE"
echo ""

read -p "Are you sure you want to restore? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Check if target table exists
echo -e "\n${YELLOW}🔍 Checking if target table exists...${NC}"
if aws dynamodb describe-table --table-name "$TARGET_TABLE" --region "$AWS_REGION" &>/dev/null; then
    echo -e "${RED}❌ Table $TARGET_TABLE already exists!${NC}"
    echo "Please delete it first or use a different name."
    exit 1
fi

# Restore from backup
echo -e "\n${YELLOW}♻️  Restoring table...${NC}"
aws dynamodb restore-table-from-backup \
    --target-table-name "$TARGET_TABLE" \
    --backup-arn "$BACKUP_ARN" \
    --region "$AWS_REGION" \
    --output json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Restore initiated for table: $TARGET_TABLE${NC}"
    
    # Wait for table to be active
    echo -e "\n${YELLOW}⏳ Waiting for table to become active...${NC}"
    aws dynamodb wait table-exists \
        --table-name "$TARGET_TABLE" \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}✅ Table is now active!${NC}"
    
    # Show table info
    echo -e "\n${YELLOW}📋 Table Information:${NC}"
    aws dynamodb describe-table \
        --table-name "$TARGET_TABLE" \
        --region "$AWS_REGION" \
        --query 'Table.[TableName,TableStatus,ItemCount,TableSizeBytes]' \
        --output table
    
    echo -e "\n${GREEN}✅ Restore completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify data: aws dynamodb scan --table-name $TARGET_TABLE --max-items 10"
    echo "2. Update application to use restored table"
    echo "3. Delete old table if no longer needed"
else
    echo -e "${RED}❌ Restore failed${NC}"
    exit 1
fi
