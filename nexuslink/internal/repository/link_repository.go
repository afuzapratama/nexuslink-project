package repository

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/google/uuid"

	"github.com/afuzapratama/nexuslink/internal/database"
	"github.com/afuzapratama/nexuslink/internal/models"
)

type LinkRepository struct {
	db *dynamodb.Client
}

func NewLinkRepository() *LinkRepository {
	return &LinkRepository{
		db: database.Client(),
	}
}

func (r *LinkRepository) Create(ctx context.Context, link *models.Link) error {
	now := time.Now().UTC()

	if link.ID == "" {
		link.ID = uuid.NewString()
	}
	if link.CreatedAt.IsZero() {
		link.CreatedAt = now
	}
	link.UpdatedAt = now

	if !link.IsActive {
		link.IsActive = true
	}

	item, err := attributevalue.MarshalMap(link)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.LinksTableName),
		Item:      item,
	})

	return err
}

func (r *LinkRepository) List(ctx context.Context) ([]models.Link, error) {
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.LinksTableName),
	})
	if err != nil {
		return nil, err
	}

	var links []models.Link
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &links); err != nil {
		return nil, err
	}

	return links, nil
}

// ListPaginated returns paginated links
func (r *LinkRepository) ListPaginated(ctx context.Context, page, limit int) ([]models.Link, int, error) {
	// Get all links first (for total count)
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.LinksTableName),
	})
	if err != nil {
		return nil, 0, err
	}

	var allLinks []models.Link
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &allLinks); err != nil {
		return nil, 0, err
	}

	total := len(allLinks)

	// Calculate offset
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	// Slice for pagination
	if offset >= total {
		return []models.Link{}, total, nil
	}

	end := offset + limit
	if end > total {
		end = total
	}

	return allLinks[offset:end], total, nil
}

// Tambahan: cari link by alias (versi simpel)
func (r *LinkRepository) FindByAlias(ctx context.Context, alias string) (*models.Link, error) {
	// Untuk tahap awal, kita scan semua lalu filter di Go.
	// Nanti kalau sudah serius & besar, baru pakai GSI di DynamoDB.
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.LinksTableName),
	})
	if err != nil {
		return nil, err
	}

	var links []models.Link
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &links); err != nil {
		return nil, err
	}

	for _, l := range links {
		if l.Alias == alias && l.IsActive {
			// return copy
			link := l
			return &link, nil
		}
	}

	return nil, nil // not found, bukan error
}

func (r *LinkRepository) GetByAlias(ctx context.Context, alias string) (*models.Link, error) {
	// Pakai scan semua + filter di aplikasi (lebih reliable untuk debug)
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.LinksTableName),
	})
	if err != nil {
		return nil, err
	}

	var links []models.Link
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &links); err != nil {
		return nil, err
	}

	// Filter di aplikasi: cari alias yang match (TIDAK filter isActive untuk bulk operations)
	for _, l := range links {
		if l.Alias == alias {
			link := l
			return &link, nil
		}
	}

	return nil, nil // not found
}

func (r *LinkRepository) Update(ctx context.Context, link *models.Link) error {
	link.UpdatedAt = time.Now().UTC()

	item, err := attributevalue.MarshalMap(link)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.LinksTableName),
		Item:      item,
	})

	return err
}

func (r *LinkRepository) Delete(ctx context.Context, id string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"id": id,
	})
	if err != nil {
		return err
	}

	_, err = r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(database.LinksTableName),
		Key:       key,
	})

	return err
}
