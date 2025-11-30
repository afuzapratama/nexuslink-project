# AWS DynamoDB Production Migration Guide

## Overview
This guide walks through migrating from local DynamoDB to AWS DynamoDB for production use.

---

## Prerequisites

1. **AWS Account** with billing enabled
2. **IAM User** with DynamoDB permissions
3. **AWS CLI** installed and configured
4. **Go environment** for running migration scripts

---

## Step 1: Create IAM User & Permissions

### 1.1 Create IAM Policy

Create a custom policy `NexusLinkDynamoDBPolicy` with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:BatchWriteItem",
        "dynamodb:BatchGetItem",
        "dynamodb:DescribeTimeToLive",
        "dynamodb:UpdateTimeToLive",
        "dynamodb:ListTables"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:*:table/Nexus*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:ListTables"
      ],
      "Resource": "*"
    }
  ]
}
```

### 1.2 Create IAM User

```bash
# Via AWS CLI
aws iam create-user --user-name nexuslink-production

# Attach policy
aws iam attach-user-policy \
  --user-name nexuslink-production \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/NexusLinkDynamoDBPolicy

# Create access key
aws iam create-access-key --user-name nexuslink-production
```

**Save the credentials:**
- Access Key ID: `AKIAIOSFODNN7EXAMPLE`
- Secret Access Key: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

---

## Step 2: Configure Tables in AWS

### 2.1 Create Tables via API

NexusLink will auto-create tables on first startup. Update your `.env`:

```bash
# Remove local endpoint
NEXUS_DYNAMO_ENDPOINT=

# Set AWS region
NEXUS_AWS_REGION=ap-southeast-1

# Set credentials
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

Start the API server and it will create all 10 tables automatically.

### 2.2 Or Create Tables Manually

```bash
# Example for NexusLinks table
aws dynamodb create-table \
  --table-name NexusLinks \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

Repeat for all tables: `NexusLinks`, `NexusNodes`, `NexusLinkStats`, `NexusNodeTokens`, `NexusClickEvents`, `NexusSettings`, `NexusLinkGroups`, `NexusWebhooks`, `NexusLinkVariants`, `NexusRateLimitSettings`

---

## Step 3: Data Migration (Optional)

If you have existing data in local DynamoDB to migrate:

### 3.1 Export from Local DynamoDB

```bash
# Install AWS Data Pipeline or use custom script
cd /home/natama/Projects/nexuslink
go run deployment/scripts/export-dynamodb.go
```

This creates JSON files for each table in `./export/` directory.

### 3.2 Import to AWS DynamoDB

```bash
go run deployment/scripts/import-dynamodb.go
```

---

## Step 4: Enable Production Features

### 4.1 Point-in-Time Recovery (PITR)

```bash
aws dynamodb update-continuous-backups \
  --table-name NexusLinks \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region ap-southeast-1
```

Repeat for all critical tables.

### 4.2 Auto-Scaling (Optional)

For tables with predictable load patterns:

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/NexusLinks" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --min-capacity 5 \
  --max-capacity 100 \
  --region ap-southeast-1

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id "table/NexusLinks" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --policy-name "NexusLinks-read-scaling-policy" \
  --policy-type "TargetTrackingScaling" \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json \
  --region ap-southeast-1
```

**scaling-policy.json:**
```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
  },
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 60
}
```

### 4.3 Enable Encryption at Rest

AWS DynamoDB encrypts data at rest by default using AWS-managed keys. To use customer-managed keys (CMK):

```bash
aws dynamodb update-table \
  --table-name NexusLinks \
  --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=alias/nexuslink-key \
  --region ap-southeast-1
```

---

## Step 5: Configure Backups

### 5.1 On-Demand Backups

```bash
# Create backup
aws dynamodb create-backup \
  --table-name NexusLinks \
  --backup-name NexusLinks-$(date +%Y%m%d-%H%M%S) \
  --region ap-southeast-1
```

### 5.2 Automated Daily Backup Script

See `deployment/scripts/backup-dynamodb.sh`

### 5.3 Setup AWS Backup (Recommended)

1. Go to AWS Backup console
2. Create backup plan:
   - Name: `NexusLink-Daily-Backup`
   - Schedule: Daily at 3 AM UTC
   - Retention: 30 days
   - Copy to: Another region (for DR)
3. Assign resources: All tables starting with `Nexus*`

---

## Step 6: Monitoring & Alarms

### 6.1 CloudWatch Alarms

```bash
# High throttle rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name NexusLinks-ThrottleAlarm \
  --alarm-description "Alert when throttle events exceed threshold" \
  --metric-name ThrottledRequests \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=NexusLinks \
  --evaluation-periods 2 \
  --region ap-southeast-1
```

### 6.2 Dashboard

Create CloudWatch dashboard to monitor:
- Read/Write capacity consumed
- Throttle events
- Latency (GetItem, PutItem, Scan)
- Table size

---

## Step 7: Performance Optimization

### 7.1 Add Global Secondary Indexes (GSI)

For frequently queried patterns:

```bash
# Example: Query links by alias
aws dynamodb update-table \
  --table-name NexusLinks \
  --attribute-definitions \
    AttributeName=alias,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"alias-index\",\"KeySchema\":[{\"AttributeName\":\"alias\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}}]" \
  --region ap-southeast-1
```

**Note:** Update application code to use GSI query instead of Scan.

### 7.2 Enable DynamoDB Streams (Optional)

For real-time event processing:

```bash
aws dynamodb update-table \
  --table-name NexusLinks \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region ap-southeast-1
```

---

## Step 8: Testing

### 8.1 Connectivity Test

```bash
# Test from API server
curl -X GET http://localhost:8080/health

# Check logs
sudo journalctl -u nexuslink-api -n 50
```

### 8.2 Performance Test

```bash
# Run load test
cd /home/natama/Projects/nexuslink
bash scripts/generate-traffic.sh 1000
```

Monitor CloudWatch metrics during test.

---

## Step 9: Cost Optimization

### 9.1 Review Billing Mode

- **On-Demand:** Good for unpredictable workloads (current default)
- **Provisioned:** Good for predictable, steady workloads (cheaper if high traffic)

Switch to provisioned if traffic is steady:

```bash
aws dynamodb update-table \
  --table-name NexusLinks \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
  --region ap-southeast-1
```

### 9.2 Enable TTL for ClickEvents

Auto-delete old click events after 90 days:

```bash
aws dynamodb update-time-to-live \
  --table-name NexusClickEvents \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --region ap-southeast-1
```

Update code to add `ttl` field (Unix timestamp) when creating click events.

---

## Rollback Plan

If issues occur:

1. **Keep local DynamoDB running** during migration
2. **Test thoroughly** before switching production traffic
3. **Have backup ready** before migration
4. **Document all changes** for easy rollback

To rollback:

```bash
# Update .env to point back to local
NEXUS_DYNAMO_ENDPOINT=http://localhost:8000

# Restart services
sudo systemctl restart nexuslink-api
sudo systemctl restart nexuslink-agent
```

---

## Estimated Costs

**Assumptions:** 1M clicks/month, 10K links

- **DynamoDB On-Demand:** ~$15-30/month
- **DynamoDB Provisioned (5 RCU, 2 WCU):** ~$5-10/month
- **Backups (PITR):** ~$2-5/month
- **Data Transfer:** ~$1-3/month

**Total:** ~$8-40/month depending on traffic and configuration.

---

## Support Resources

- **AWS DynamoDB Docs:** https://docs.aws.amazon.com/dynamodb/
- **Best Practices:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- **Pricing Calculator:** https://calculator.aws/

---

## Checklist

- [ ] IAM user created with correct permissions
- [ ] Tables created in AWS region
- [ ] PITR enabled for critical tables
- [ ] Backups configured (AWS Backup or script)
- [ ] CloudWatch alarms set up
- [ ] GSI added for common queries (optional)
- [ ] Application tested with AWS DynamoDB
- [ ] Cost monitoring enabled
- [ ] Documentation updated with production URLs
- [ ] Team trained on AWS console access
