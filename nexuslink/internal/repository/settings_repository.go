package repository

import (
	"context"
	"errors"
	"time"

	"github.com/afuzapratama/nexuslink/internal/database"
	"github.com/afuzapratama/nexuslink/internal/models"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type SettingsRepository struct {
	client *dynamodb.Client
}

func NewSettingsRepository() *SettingsRepository {
	return &SettingsRepository{
		client: database.Client(),
	}
}

// Get mengambil settings global (ID = "global-settings")
func (r *SettingsRepository) Get(ctx context.Context) (*models.Settings, error) {
	out, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(database.SettingsTableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: "global-settings"},
		},
	})
	if err != nil {
		return nil, err
	}

	if out.Item == nil {
		return nil, nil // not found
	}

	var s models.Settings
	if err := attributevalue.UnmarshalMap(out.Item, &s); err != nil {
		return nil, err
	}

	return &s, nil
}

// GetOrDefault mengambil settings, jika tidak ada return default
func (r *SettingsRepository) GetOrDefault(ctx context.Context) *models.Settings {
	s, err := r.Get(ctx)
	if err != nil || s == nil {
		return models.DefaultSettings()
	}
	return s
}

// Update menyimpan/update settings global
func (r *SettingsRepository) Update(ctx context.Context, settings *models.Settings) error {
	if settings == nil {
		return errors.New("settings cannot be nil")
	}

	// Pastikan ID selalu "global-settings"
	settings.ID = "global-settings"
	settings.UpdatedAt = time.Now().UTC()

	// Jika createdAt kosong, isi dengan sekarang (artinya ini insert pertama)
	if settings.CreatedAt.IsZero() {
		settings.CreatedAt = settings.UpdatedAt
	}

	item, err := attributevalue.MarshalMap(settings)
	if err != nil {
		return err
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.SettingsTableName),
		Item:      item,
	})

	return err
}

// GetRateLimitConfig returns current rate limit configuration
func (r *SettingsRepository) GetRateLimitConfig() map[string]int {
	ctx := context.Background()
	settings := r.GetOrDefault(ctx)

	return map[string]int{
		"ip_limit":       settings.RateLimitPerIP,
		"link_limit":     settings.RateLimitPerLink,
		"window_seconds": settings.RateLimitWindow,
	}
}

// UpdateRateLimitConfig updates rate limit settings
func (r *SettingsRepository) UpdateRateLimitConfig(ipLimit, linkLimit, window int) error {
	ctx := context.Background()
	settings := r.GetOrDefault(ctx)

	if ipLimit > 0 {
		settings.RateLimitPerIP = ipLimit
	}
	if linkLimit > 0 {
		settings.RateLimitPerLink = linkLimit
	}
	if window > 0 {
		settings.RateLimitWindow = window
	}

	return r.Update(ctx, settings)
}
