#!/bin/bash
#
# NexusLink DynamoDB Backup Script
# Automated backup of all DynamoDB tables to S3
#
# Usage: bash backup-dynamodb.sh [backup-name]
# Example: bash backup-dynamodb.sh manual-backup-20241130
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
AWS_REGION="${NEXUS_AWS_REGION:-ap-southeast-1}"
BACKUP_PREFIX="${1:-auto-backup-$(date +%Y%m%d-%H%M%S)}"
S3_BUCKET="${NEXUS_BACKUP_S3_BUCKET:-}"  # Optional: for S3 export

# Table list
TABLES=(
    "NexusLinks"
    "NexusNodes"
    "NexusLinkStats"
    "NexusNodeTokens"
    "NexusClickEvents"
    "NexusSettings"
    "NexusLinkGroups"
    "NexusWebhooks"
    "NexusLinkVariants"
    "NexusRateLimitSettings"
)

echo -e "${GREEN}🗄️  NexusLink DynamoDB Backup${NC}"
echo "Backup Name: $BACKUP_PREFIX"
echo "Region: $AWS_REGION"
echo "Tables: ${#TABLES[@]}"
echo "----------------------------------------"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Function to create on-demand backup
create_backup() {
    local table=$1
    local backup_name="${BACKUP_PREFIX}-${table}"
    
    echo -e "\n${YELLOW}📦 Backing up table: $table${NC}"
    
    aws dynamodb create-backup \
        --table-name "$table" \
        --backup-name "$backup_name" \
        --region "$AWS_REGION" \
        --output json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup created: $backup_name${NC}"
    else
        echo -e "${RED}❌ Failed to backup: $table${NC}"
        return 1
    fi
}

# Function to export to S3 (requires Data Pipeline or manual export)
export_to_s3() {
    local table=$1
    
    if [ -z "$S3_BUCKET" ]; then
        echo -e "${YELLOW}⚠️  S3 export skipped (no bucket configured)${NC}"
        return 0
    fi
    
    echo -e "\n${YELLOW}☁️  Exporting table to S3: $table${NC}"
    
    # Note: This requires DynamoDB export feature (available in newer AWS regions)
    aws dynamodb export-table-to-point-in-time \
        --table-arn "arn:aws:dynamodb:${AWS_REGION}:*:table/${table}" \
        --s3-bucket "$S3_BUCKET" \
        --s3-prefix "nexuslink-backups/${BACKUP_PREFIX}/${table}" \
        --export-format DYNAMODB_JSON \
        --region "$AWS_REGION" \
        --output json 2>/dev/null || {
            echo -e "${YELLOW}⚠️  Export to S3 not available for this table${NC}"
        }
}

# Main backup loop
BACKUP_SUCCESS=0
BACKUP_FAILED=0

for table in "${TABLES[@]}"; do
    if create_backup "$table"; then
        ((BACKUP_SUCCESS++))
        
        # Optional S3 export
        if [ -n "$S3_BUCKET" ]; then
            export_to_s3 "$table"
        fi
    else
        ((BACKUP_FAILED++))
    fi
done

# Summary
echo -e "\n${GREEN}📊 Backup Summary:${NC}"
echo "----------------------------------------"
echo "Total Tables: ${#TABLES[@]}"
echo -e "${GREEN}Success: $BACKUP_SUCCESS${NC}"
echo -e "${RED}Failed: $BACKUP_FAILED${NC}"

# List backups
echo -e "\n${YELLOW}📋 Recent Backups:${NC}"
aws dynamodb list-backups \
    --region "$AWS_REGION" \
    --max-results 10 \
    --output table

# Save backup info
BACKUP_LOG="/var/log/nexuslink/backups.log"
if [ -d "/var/log/nexuslink" ]; then
    echo "[$(date)] Backup completed: $BACKUP_PREFIX - Success: $BACKUP_SUCCESS, Failed: $BACKUP_FAILED" >> "$BACKUP_LOG"
fi

if [ $BACKUP_FAILED -gt 0 ]; then
    echo -e "\n${RED}❌ Backup completed with errors${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ Backup completed successfully!${NC}"
    exit 0
fi
