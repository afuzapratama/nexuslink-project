package main

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func main() {
	ctx := context.Background()

	// Configure DynamoDB client
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("ap-southeast-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("dummy", "dummy", "")),
	)
	if err != nil {
		log.Fatal(err)
	}

	client := dynamodb.NewFromConfig(cfg, func(o *dynamodb.Options) {
		o.BaseEndpoint = aws.String("http://localhost:8000")
	})

	tables := []string{
		"NexusLinks",
		"NexusLinkStats",
		"NexusClickEvents",
		"NexusNodes",
		"NexusNodeTokens",
		"NexusLinkGroups",
		"NexusWebhooks",
		"NexusLinkVariants",
		"NexusSettings",
	}

	fmt.Println("🗑️  Clearing all DynamoDB tables...")
	fmt.Println()

	for _, tableName := range tables {
		fmt.Printf("📋 Clearing table: %s\n", tableName)

		// Get table key schema
		descOut, err := client.DescribeTable(ctx, &dynamodb.DescribeTableInput{
			TableName: aws.String(tableName),
		})
		if err != nil {
			fmt.Printf("   ⚠ Could not describe table: %v\n", err)
			continue
		}

		// Extract key attribute names
		var hashKey, rangeKey string
		for _, key := range descOut.Table.KeySchema {
			if key.KeyType == types.KeyTypeHash {
				hashKey = *key.AttributeName
			} else if key.KeyType == types.KeyTypeRange {
				rangeKey = *key.AttributeName
			}
		}

		// Scan and delete all items
		deleted := 0
		var lastKey map[string]types.AttributeValue

		for {
			scanInput := &dynamodb.ScanInput{
				TableName: aws.String(tableName),
				Limit:     aws.Int32(25),
			}
			if lastKey != nil {
				scanInput.ExclusiveStartKey = lastKey
			}

			scanOut, err := client.Scan(ctx, scanInput)
			if err != nil {
				fmt.Printf("   ⚠ Scan error: %v\n", err)
				break
			}

			if len(scanOut.Items) == 0 {
				break
			}

			// Delete each item
			for _, item := range scanOut.Items {
				key := make(map[string]types.AttributeValue)
				if hashKey != "" {
					if val, ok := item[hashKey]; ok {
						key[hashKey] = val
					}
				}
				if rangeKey != "" {
					if val, ok := item[rangeKey]; ok {
						key[rangeKey] = val
					}
				}

				if len(key) > 0 {
					_, err := client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
						TableName: aws.String(tableName),
						Key:       key,
					})
					if err == nil {
						deleted++
					}
				}
			}

			lastKey = scanOut.LastEvaluatedKey
			if lastKey == nil {
				break
			}
		}

		if deleted == 0 {
			fmt.Printf("   ✓ Table was already empty\n")
		} else {
			fmt.Printf("   ✓ Deleted %d items\n", deleted)
		}
	}

	fmt.Println()
	fmt.Println("✅ All tables cleared successfully!")
}
