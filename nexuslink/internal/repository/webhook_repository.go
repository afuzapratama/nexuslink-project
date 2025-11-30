package repository

import (
	"context"
	"fmt"
	"log"

	"github.com/afuzapratama/nexuslink/internal/models"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type WebhookRepository struct {
	client    *dynamodb.Client
	tableName string
}

func NewWebhookRepository(client *dynamodb.Client, tableName string) *WebhookRepository {
	return &WebhookRepository{
		client:    client,
		tableName: tableName,
	}
}

// GetAll returns all webhooks
func (r *WebhookRepository) GetAll(ctx context.Context) ([]models.Webhook, error) {
	result, err := r.client.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(r.tableName),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to scan webhooks: %w", err)
	}

	var webhooks []models.Webhook
	if err := attributevalue.UnmarshalListOfMaps(result.Items, &webhooks); err != nil {
		return nil, fmt.Errorf("failed to unmarshal webhooks: %w", err)
	}

	return webhooks, nil
}

// GetByID returns a webhook by ID
func (r *WebhookRepository) GetByID(ctx context.Context, id string) (*models.Webhook, error) {
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get webhook: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("webhook not found")
	}

	var webhook models.Webhook
	if err := attributevalue.UnmarshalMap(result.Item, &webhook); err != nil {
		return nil, fmt.Errorf("failed to unmarshal webhook: %w", err)
	}

	return &webhook, nil
}

// GetByEvent returns all active webhooks subscribed to a specific event
func (r *WebhookRepository) GetByEvent(ctx context.Context, event string) ([]models.Webhook, error) {
	// Get all webhooks and filter by event
	allWebhooks, err := r.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	var matchingWebhooks []models.Webhook
	for _, webhook := range allWebhooks {
		if !webhook.IsActive {
			continue
		}
		for _, e := range webhook.Events {
			if e == event {
				matchingWebhooks = append(matchingWebhooks, webhook)
				break
			}
		}
	}

	return matchingWebhooks, nil
}

// Create creates a new webhook
func (r *WebhookRepository) Create(ctx context.Context, webhook *models.Webhook) error {
	item, err := attributevalue.MarshalMap(webhook)
	if err != nil {
		return fmt.Errorf("failed to marshal webhook: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to create webhook: %w", err)
	}

	log.Printf("Webhook created: %s (URL: %s, Events: %v)", webhook.ID, webhook.URL, webhook.Events)
	return nil
}

// Update updates an existing webhook
func (r *WebhookRepository) Update(ctx context.Context, webhook *models.Webhook) error {
	item, err := attributevalue.MarshalMap(webhook)
	if err != nil {
		return fmt.Errorf("failed to marshal webhook: %w", err)
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to update webhook: %w", err)
	}

	log.Printf("Webhook updated: %s", webhook.ID)
	return nil
}

// Delete deletes a webhook
func (r *WebhookRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete webhook: %w", err)
	}

	log.Printf("Webhook deleted: %s", id)
	return nil
}
