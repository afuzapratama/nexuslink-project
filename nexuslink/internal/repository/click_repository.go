package repository

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"

	"github.com/afuzapratama/nexuslink/internal/database"
	"github.com/afuzapratama/nexuslink/internal/models"
)

type ClickRepository struct {
	db *dynamodb.Client
}

func NewClickRepository() *ClickRepository {
	return &ClickRepository{
		db: database.Client(),
	}
}

// Log satu event klik
func (r *ClickRepository) LogClick(ctx context.Context, ev *models.ClickEvent) error {
	if ev.ID == "" {
		ev.ID = uuid.NewString()
	}
	if ev.CreatedAt.IsZero() {
		ev.CreatedAt = time.Now().UTC()
	}

	item, err := attributevalue.MarshalMap(ev)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.ClickEventsTableName),
		Item:      item,
	})
	return err
}

// Ambil semua click events untuk alias tertentu (untuk dev masih pakai Scan)
func (r *ClickRepository) ListByAlias(ctx context.Context, alias string) ([]models.ClickEvent, error) {
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(database.ClickEventsTableName),
		FilterExpression: aws.String("#a = :alias"),
		ExpressionAttributeNames: map[string]string{
			"#a": "alias",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":alias": &types.AttributeValueMemberS{Value: alias},
		},
	})
	if err != nil {
		return nil, err
	}

	var events []models.ClickEvent
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &events); err != nil {
		return nil, err
	}
	return events, nil
}

// ListByAliasPaginated returns paginated click events for a specific alias
func (r *ClickRepository) ListByAliasPaginated(ctx context.Context, alias string, page, limit int) ([]models.ClickEvent, int, error) {
	// Get all events for total count
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(database.ClickEventsTableName),
		FilterExpression: aws.String("#a = :alias"),
		ExpressionAttributeNames: map[string]string{
			"#a": "alias",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":alias": &types.AttributeValueMemberS{Value: alias},
		},
	})
	if err != nil {
		return nil, 0, err
	}

	var allEvents []models.ClickEvent
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &allEvents); err != nil {
		return nil, 0, err
	}

	total := len(allEvents)

	// Calculate offset
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	// Slice for pagination
	if offset >= total {
		return []models.ClickEvent{}, total, nil
	}

	end := offset + limit
	if end > total {
		end = total
	}

	return allEvents[offset:end], total, nil
}

// ListAllPaginated returns paginated click events for all links (for dashboard)
func (r *ClickRepository) ListAllPaginated(ctx context.Context, page, limit int) ([]models.ClickEvent, int, error) {
	// Scan all events (for production, consider GSI or better pagination strategy)
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.ClickEventsTableName),
	})
	if err != nil {
		return nil, 0, err
	}

	var allEvents []models.ClickEvent
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &allEvents); err != nil {
		return nil, 0, err
	}

	total := len(allEvents)

	// Calculate offset
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	// Slice for pagination
	if offset >= total {
		return []models.ClickEvent{}, total, nil
	}

	end := offset + limit
	if end > total {
		end = total
	}

	return allEvents[offset:end], total, nil
}

// DeleteByLinkAlias deletes all click events for a given link alias
func (r *ClickRepository) DeleteByLinkAlias(ctx context.Context, alias string) error {
	// First, scan to find all items with this alias
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(database.ClickEventsTableName),
		FilterExpression: aws.String("#a = :alias"),
		ExpressionAttributeNames: map[string]string{
			"#a": "alias",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":alias": &types.AttributeValueMemberS{Value: alias},
		},
	})
	if err != nil {
		return err
	}

	if len(out.Items) == 0 {
		return nil // No events to delete
	}

	// Delete each item
	for _, item := range out.Items {
		if idAttr, ok := item["id"]; ok {
			_, err := r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
				TableName: aws.String(database.ClickEventsTableName),
				Key: map[string]types.AttributeValue{
					"id": idAttr,
				},
			})
			if err != nil {
				return err
			}
		}
	}

	return nil
}
