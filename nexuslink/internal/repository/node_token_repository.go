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

type NodeTokenRepository struct {
	db *dynamodb.Client
}

func NewNodeTokenRepository() *NodeTokenRepository {
	return &NodeTokenRepository{
		db: database.Client(),
	}
}

func (r *NodeTokenRepository) Create(ctx context.Context, label string, token string) (*models.NodeToken, error) {
	now := time.Now().UTC()

	nt := &models.NodeToken{
		Token:     token,
		Label:     label,
		CreatedAt: now,
		IsUsed:    false,
	}

	item, err := attributevalue.MarshalMap(nt)
	if err != nil {
		return nil, err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.NodeTokensTableName),
		Item:      item,
	})
	if err != nil {
		return nil, err
	}

	return nt, nil
}

func (r *NodeTokenRepository) Get(ctx context.Context, token string) (*models.NodeToken, error) {
	out, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(database.NodeTokensTableName),
		Key: map[string]types.AttributeValue{
			"token": &types.AttributeValueMemberS{Value: token},
		},
	})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return nil, nil
	}

	var nt models.NodeToken
	if err := attributevalue.UnmarshalMap(out.Item, &nt); err != nil {
		return nil, err
	}
	return &nt, nil
}

func (r *NodeTokenRepository) List(ctx context.Context) ([]models.NodeToken, error) {
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.NodeTokensTableName),
	})
	if err != nil {
		return nil, err
	}

	var tokens []models.NodeToken
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &tokens); err != nil {
		return nil, err
	}
	return tokens, nil
}

func (r *NodeTokenRepository) MarkUsed(ctx context.Context, token string) error {
	now := time.Now().UTC().Format(time.RFC3339)

	_, err := r.db.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(database.NodeTokensTableName),
		Key: map[string]types.AttributeValue{
			"token": &types.AttributeValueMemberS{Value: token},
		},
		UpdateExpression: aws.String("SET isUsed = :used, usedAt = :usedAt"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":used":   &types.AttributeValueMemberBOOL{Value: true},
			":usedAt": &types.AttributeValueMemberS{Value: now},
		},
	})
	return err
}
