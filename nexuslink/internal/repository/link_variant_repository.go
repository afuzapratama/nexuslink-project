package repository

import (
	"context"
	"time"

	"github.com/afuzapratama/nexuslink/internal/models"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type LinkVariantRepository struct {
	client *dynamodb.Client
	table  string
}

func NewLinkVariantRepository(client *dynamodb.Client) *LinkVariantRepository {
	return &LinkVariantRepository{
		client: client,
		table:  "NexusLinkVariants",
	}
}

// GetByLinkID returns all variants for a given link alias
func (r *LinkVariantRepository) GetByLinkID(ctx context.Context, linkID string) ([]models.LinkVariant, error) {
	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.table),
		KeyConditionExpression: aws.String("linkId = :linkId"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":linkId": &types.AttributeValueMemberS{Value: linkID},
		},
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return nil, err
	}

	var variants []models.LinkVariant
	if err := attributevalue.UnmarshalListOfMaps(result.Items, &variants); err != nil {
		return nil, err
	}

	return variants, nil
}

// GetByID retrieves a specific variant by linkID and variantID
func (r *LinkVariantRepository) GetByID(ctx context.Context, linkID, variantID string) (*models.LinkVariant, error) {
	input := &dynamodb.GetItemInput{
		TableName: aws.String(r.table),
		Key: map[string]types.AttributeValue{
			"linkId": &types.AttributeValueMemberS{Value: linkID},
			"id":     &types.AttributeValueMemberS{Value: variantID},
		},
	}

	result, err := r.client.GetItem(ctx, input)
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, nil
	}

	var variant models.LinkVariant
	if err := attributevalue.UnmarshalMap(result.Item, &variant); err != nil {
		return nil, err
	}

	return &variant, nil
}

// Create adds a new variant
func (r *LinkVariantRepository) Create(ctx context.Context, variant *models.LinkVariant) error {
	variant.CreatedAt = time.Now()
	variant.UpdatedAt = time.Now()

	av, err := attributevalue.MarshalMap(variant)
	if err != nil {
		return err
	}

	input := &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      av,
	}

	_, err = r.client.PutItem(ctx, input)
	return err
}

// Update modifies an existing variant
func (r *LinkVariantRepository) Update(ctx context.Context, variant *models.LinkVariant) error {
	variant.UpdatedAt = time.Now()

	av, err := attributevalue.MarshalMap(variant)
	if err != nil {
		return err
	}

	input := &dynamodb.PutItemInput{
		TableName: aws.String(r.table),
		Item:      av,
	}

	_, err = r.client.PutItem(ctx, input)
	return err
}

// Delete removes a variant
func (r *LinkVariantRepository) Delete(ctx context.Context, linkID, variantID string) error {
	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(r.table),
		Key: map[string]types.AttributeValue{
			"linkId": &types.AttributeValueMemberS{Value: linkID},
			"id":     &types.AttributeValueMemberS{Value: variantID},
		},
	}

	_, err := r.client.DeleteItem(ctx, input)
	return err
}

// IncrementClicks atomically increments the click count for a variant
func (r *LinkVariantRepository) IncrementClicks(ctx context.Context, linkID, variantID string) error {
	input := &dynamodb.UpdateItemInput{
		TableName: aws.String(r.table),
		Key: map[string]types.AttributeValue{
			"linkId": &types.AttributeValueMemberS{Value: linkID},
			"id":     &types.AttributeValueMemberS{Value: variantID},
		},
		UpdateExpression: aws.String("SET clicks = if_not_exists(clicks, :zero) + :inc, updatedAt = :now"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":zero": &types.AttributeValueMemberN{Value: "0"},
			":inc":  &types.AttributeValueMemberN{Value: "1"},
			":now":  &types.AttributeValueMemberS{Value: time.Now().Format(time.RFC3339)},
		},
	}

	_, err := r.client.UpdateItem(ctx, input)
	return err
}

// IncrementConversions atomically increments the conversion count for a variant
func (r *LinkVariantRepository) IncrementConversions(ctx context.Context, linkID, variantID string) error {
	input := &dynamodb.UpdateItemInput{
		TableName: aws.String(r.table),
		Key: map[string]types.AttributeValue{
			"linkId": &types.AttributeValueMemberS{Value: linkID},
			"id":     &types.AttributeValueMemberS{Value: variantID},
		},
		UpdateExpression: aws.String("SET conversions = if_not_exists(conversions, :zero) + :inc, updatedAt = :now"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":zero": &types.AttributeValueMemberN{Value: "0"},
			":inc":  &types.AttributeValueMemberN{Value: "1"},
			":now":  &types.AttributeValueMemberS{Value: time.Now().Format(time.RFC3339)},
		},
	}

	_, err := r.client.UpdateItem(ctx, input)
	return err
}
