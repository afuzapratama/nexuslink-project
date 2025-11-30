package repository

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/afuzapratama/nexuslink/internal/database"
	"github.com/afuzapratama/nexuslink/internal/models"
)

type LinkStatsRepository struct {
	db *dynamodb.Client
}

func NewLinkStatsRepository() *LinkStatsRepository {
	return &LinkStatsRepository{
		db: database.Client(),
	}
}

// IncrementHit akan menambah hitCount untuk kombinasi nodeId + alias.
// Key utama kita bentuk "nodeId#alias".
func (r *LinkStatsRepository) IncrementHit(ctx context.Context, nodeID, alias string) error {
	if nodeID == "" || alias == "" {
		return nil
	}

	key := nodeID + "#" + alias
	now := time.Now().UTC().Format(time.RFC3339)

	_, err := r.db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(database.LinkStatsTableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: key},
		},
		// SET field-field deskriptif, dan ADD hitCount (atomic counter)
		UpdateExpression: aws.String("SET nodeId = :nodeId, alias = :alias, lastHitAt = :lastHitAt ADD hitCount :inc"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":nodeId":    &types.AttributeValueMemberS{Value: nodeID},
			":alias":     &types.AttributeValueMemberS{Value: alias},
			":lastHitAt": &types.AttributeValueMemberS{Value: now},
			":inc":       &types.AttributeValueMemberN{Value: "1"},
		},
	})

	return err
}

func (r *LinkStatsRepository) Get(ctx context.Context, nodeID, alias string) (*models.LinkStat, error) {
	if nodeID == "" || alias == "" {
		return nil, nil
	}

	key := nodeID + "#" + alias

	out, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(database.LinkStatsTableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: key},
		},
	})
	if err != nil {
		return nil, err
	}

	if out.Item == nil {
		return nil, nil
	}

	var stat models.LinkStat
	if err := attributevalue.UnmarshalMap(out.Item, &stat); err != nil {
		return nil, err
	}

	return &stat, nil
}

func (r *LinkStatsRepository) ListAll(ctx context.Context) ([]models.LinkStat, error) {
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.LinkStatsTableName),
	})
	if err != nil {
		return nil, err
	}

	var stats []models.LinkStat
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &stats); err != nil {
		return nil, err
	}

	return stats, nil
}

// DeleteByLinkAlias deletes all stats records for a given link alias
func (r *LinkStatsRepository) DeleteByLinkAlias(ctx context.Context, alias string) error {
	// First, scan to find all items with this alias
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName:        aws.String(database.LinkStatsTableName),
		FilterExpression: aws.String("alias = :alias"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":alias": &types.AttributeValueMemberS{Value: alias},
		},
	})
	if err != nil {
		return err
	}

	if len(out.Items) == 0 {
		return nil // No stats to delete
	}

	// Delete each item
	for _, item := range out.Items {
		if idAttr, ok := item["id"]; ok {
			_, err := r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
				TableName: aws.String(database.LinkStatsTableName),
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
