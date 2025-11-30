package database

import (
	"context"
	"errors"
	"log"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	nexusConfig "github.com/afuzapratama/nexuslink/internal/config"
)

var (
	client *dynamodb.Client
	once   sync.Once
)

const (
	LinksTableName       = "NexusLinks"
	NodesTableName       = "NexusNodes"
	LinkStatsTableName   = "NexusLinkStats"
	NodeTokensTableName  = "NexusNodeTokens"
	ClickEventsTableName = "NexusClickEvents"
	SettingsTableName    = "NexusSettings"
	LinkGroupsTableName  = "NexusLinkGroups"
	WebhooksTableName    = "NexusWebhooks"
)

// Client mengembalikan singleton DynamoDB client
func Client() *dynamodb.Client {
	once.Do(func() {
		// Pastikan .env sudah diload
		nexusConfig.Init()

		endpoint := nexusConfig.GetEnv("NEXUS_DYNAMO_ENDPOINT", "")
		region := nexusConfig.GetEnv("NEXUS_AWS_REGION", "ap-southeast-1")

		log.Printf("DynamoDB client init: endpoint=%s region=%s\n", endpoint, region)

		// Build AWS config
		var cfg aws.Config

		if endpoint != "" {
			// Development mode: Local DynamoDB
			log.Println("Using local DynamoDB endpoint")
			creds := aws.NewCredentialsCache(
				credentials.NewStaticCredentialsProvider("local", "local", ""),
			)

			resolver := aws.EndpointResolverWithOptionsFunc(
				func(service, region string, options ...interface{}) (aws.Endpoint, error) {
					return aws.Endpoint{
						URL: endpoint,
					}, nil
				},
			)

			cfg = aws.Config{
				Region:                      region,
				Credentials:                 creds,
				EndpointResolverWithOptions: resolver,
			}
		} else {
			// Production mode: AWS DynamoDB
			log.Println("Using AWS DynamoDB (production)")
			
			// Check for explicit credentials in ENV
			accessKeyID := nexusConfig.GetEnv("AWS_ACCESS_KEY_ID", "")
			secretAccessKey := nexusConfig.GetEnv("AWS_SECRET_ACCESS_KEY", "")

			if accessKeyID != "" && secretAccessKey != "" {
				// Use explicit credentials
				log.Println("Using AWS credentials from environment variables")
				cfg = aws.Config{
					Region: region,
					Credentials: aws.NewCredentialsCache(
						credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
					),
				}
			} else {
				// Use default AWS credential chain (IAM role, ~/.aws/credentials, etc)
				log.Println("Using AWS default credential chain (IAM role or ~/.aws/credentials)")
				
				// Load default config (akan pakai IAM role kalau di EC2)
				ctx := context.Background()
				defaultCfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
				if err != nil {
					log.Fatalf("Failed to load AWS config: %v", err)
				}
				cfg = defaultCfg
			}
		}

		client = dynamodb.NewFromConfig(cfg)
	})

	return client
}

// EnsureTables memastikan tabel utama (NexusLinks) ada, kalau belum akan dibuat
func EnsureTables(ctx context.Context) error {
	c := Client()

	// ---- Tabel Links ----
	log.Println("NexusLink: checking table", LinksTableName)
	_, err := c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(LinksTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", LinksTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(LinksTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", LinksTableName)
	} else {
		log.Println("NexusLink: table already exists:", LinksTableName)
	}

	// ---- Tabel Nodes ----
	log.Println("NexusLink: checking table", NodesTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(NodesTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", NodesTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(NodesTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", NodesTableName)
	} else {
		log.Println("NexusLink: table already exists:", NodesTableName)
	}

	// ---- Tabel LinkStats ----
	log.Println("NexusLink: checking table", LinkStatsTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(LinkStatsTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", LinkStatsTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(LinkStatsTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", LinkStatsTableName)
	} else {
		log.Println("NexusLink: table already exists:", LinkStatsTableName)
	}

	// ---- Tabel NodeTokens ----
	log.Println("NexusLink: checking table", NodeTokensTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(NodeTokensTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", NodeTokensTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(NodeTokensTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("token"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("token"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", NodeTokensTableName)
	} else {
		log.Println("NexusLink: table already exists:", NodeTokensTableName)
	}

	// ---- Tabel ClickEvents ----
	log.Println("NexusLink: checking table", ClickEventsTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(ClickEventsTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", ClickEventsTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(ClickEventsTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", ClickEventsTableName)
	} else {
		log.Println("NexusLink: table already exists:", ClickEventsTableName)
	}

	// ---- Tabel Settings ----
	log.Println("NexusLink: checking table", SettingsTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(SettingsTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", SettingsTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(SettingsTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", SettingsTableName)
	} else {
		log.Println("NexusLink: table already exists:", SettingsTableName)
	}

	// ---- Tabel LinkGroups ----
	log.Println("NexusLink: checking table", LinkGroupsTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(LinkGroupsTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", LinkGroupsTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(LinkGroupsTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", LinkGroupsTableName)
	} else {
		log.Println("NexusLink: table already exists:", LinkGroupsTableName)
	}

	// ---- Tabel Webhooks ----
	log.Println("NexusLink: checking table", WebhooksTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(WebhooksTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", WebhooksTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(WebhooksTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeHash,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", WebhooksTableName)
	} else {
		log.Println("NexusLink: table already exists:", WebhooksTableName)
	}

	// ---- Tabel Link Variants (A/B Testing) ----
	variantsTableName := "NexusLinkVariants"
	log.Println("NexusLink: checking table", variantsTableName)
	_, err = c.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(variantsTableName),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if !errors.As(err, &rnfe) {
			return err
		}

		log.Println("NexusLink: table not found, creating...", variantsTableName)

		_, err = c.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(variantsTableName),
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("linkId"),
					AttributeType: types.ScalarAttributeTypeS,
				},
				{
					AttributeName: aws.String("id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("linkId"),
					KeyType:       types.KeyTypeHash, // Partition key
				},
				{
					AttributeName: aws.String("id"),
					KeyType:       types.KeyTypeRange, // Sort key
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		})
		if err != nil {
			return err
		}
		log.Println("NexusLink: table created:", variantsTableName)
	} else {
		log.Println("NexusLink: table already exists:", variantsTableName)
	}

	return nil
}
