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

type LinkGroupRepository struct {
	db *dynamodb.Client
}

func NewLinkGroupRepository() *LinkGroupRepository {
	return &LinkGroupRepository{
		db: database.Client(),
	}
}

func (r *LinkGroupRepository) Create(ctx context.Context, group *models.LinkGroup) error {
	now := time.Now().UTC()
	group.ID = uuid.NewString()
	group.CreatedAt = now
	group.UpdatedAt = now

	item, err := attributevalue.MarshalMap(group)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.LinkGroupsTableName),
		Item:      item,
	})
	return err
}

func (r *LinkGroupRepository) Update(ctx context.Context, group *models.LinkGroup) error {
	group.UpdatedAt = time.Now().UTC()

	item, err := attributevalue.MarshalMap(group)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.LinkGroupsTableName),
		Item:      item,
	})
	return err
}

func (r *LinkGroupRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(database.LinkGroupsTableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: id},
		},
	})
	return err
}

func (r *LinkGroupRepository) Get(ctx context.Context, id string) (*models.LinkGroup, error) {
	out, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(database.LinkGroupsTableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		return nil, err
	}

	if out.Item == nil {
		return nil, nil
	}

	var group models.LinkGroup
	if err := attributevalue.UnmarshalMap(out.Item, &group); err != nil {
		return nil, err
	}

	return &group, nil
}

func (r *LinkGroupRepository) List(ctx context.Context) ([]models.LinkGroup, error) {
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.LinkGroupsTableName),
	})
	if err != nil {
		return nil, err
	}

	var groups []models.LinkGroup
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &groups); err != nil {
		return nil, err
	}

	// Sort by SortOrder
	// Simple bubble sort karena jumlah group biasanya kecil
	for i := 0; i < len(groups)-1; i++ {
		for j := 0; j < len(groups)-i-1; j++ {
			if groups[j].SortOrder > groups[j+1].SortOrder {
				groups[j], groups[j+1] = groups[j+1], groups[j]
			}
		}
	}

	return groups, nil
}
