package repository

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"github.com/afuzapratama/nexuslink/internal/config"
	"github.com/afuzapratama/nexuslink/internal/database"
	"github.com/afuzapratama/nexuslink/internal/models"
)

type NodeRepository struct {
	db *dynamodb.Client
}

func NewNodeRepository() *NodeRepository {
	return &NodeRepository{
		db: database.Client(),
	}
}

// UpsertNode: dipakai untuk heartbeat – kalau belum ada, dibuat; kalau sudah, update lastSeen
func (r *NodeRepository) UpsertNode(ctx context.Context, n *models.Node) error {
	now := time.Now().UTC()
	n.LastSeenAt = now
	n.IsOnline = true

	item, err := attributevalue.MarshalMap(n)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.NodesTableName),
		Item:      item,
	})

	return err
}

// Helper untuk bikin Node dari env Agent (dipakai di API nanti juga kalau perlu)
func NodeFromEnv() *models.Node {
	config.Init()

	return &models.Node{
		ID:        config.GetEnv("NEXUS_NODE_ID", "node-local-1"),
		Name:      config.GetEnv("NEXUS_NODE_NAME", "Local Dev Node"),
		Region:    config.GetEnv("NEXUS_NODE_REGION", "ID-JKT"),
		PublicURL: config.GetEnv("NEXUS_NODE_PUBLIC_URL", "http://localhost:9090"),
	}
}

// 🔹 Tambahan: list semua node
func (r *NodeRepository) List(ctx context.Context) ([]models.Node, error) {
	out, err := r.db.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(database.NodesTableName),
	})
	if err != nil {
		return nil, err
	}

	var nodes []models.Node
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &nodes); err != nil {
		return nil, err
	}

	return nodes, nil
}

// GetByID retrieves a node by its ID
func (r *NodeRepository) GetByID(ctx context.Context, id string) (*models.Node, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"id": id,
	})
	if err != nil {
		return nil, err
	}

	result, err := r.db.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(database.NodesTableName),
		Key:       key,
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, nil // Node not found
	}

	var node models.Node
	if err := attributevalue.UnmarshalMap(result.Item, &node); err != nil {
		return nil, err
	}

	return &node, nil
}

// Delete removes a node from the database
func (r *NodeRepository) Delete(ctx context.Context, id string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"id": id,
	})
	if err != nil {
		return err
	}

	_, err = r.db.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(database.NodesTableName),
		Key:       key,
	})

	return err
}

// AddDomain adds a new domain to a node's domain list
func (r *NodeRepository) AddDomain(ctx context.Context, nodeID, domain string) error {
	node, err := r.GetByID(ctx, nodeID)
	if err != nil {
		return err
	}
	if node == nil {
		return nil // Node not found
	}

	// Check if domain already exists
	for _, d := range node.Domains {
		if d == domain {
			return nil // Already exists, no need to add
		}
	}

	// Add domain to list
	node.Domains = append(node.Domains, domain)

	// Update node
	item, err := attributevalue.MarshalMap(node)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.NodesTableName),
		Item:      item,
	})

	return err
}

// RemoveDomain removes a domain from a node's domain list
func (r *NodeRepository) RemoveDomain(ctx context.Context, nodeID, domain string) error {
	node, err := r.GetByID(ctx, nodeID)
	if err != nil {
		return err
	}
	if node == nil {
		return nil // Node not found
	}

	// Remove domain from list
	newDomains := []string{}
	for _, d := range node.Domains {
		if d != domain {
			newDomains = append(newDomains, d)
		}
	}
	node.Domains = newDomains

	// Update node
	item, err := attributevalue.MarshalMap(node)
	if err != nil {
		return err
	}

	_, err = r.db.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(database.NodesTableName),
		Item:      item,
	})

	return err
}

// GetNodeByDomain finds a node that serves a specific domain
func (r *NodeRepository) GetNodeByDomain(ctx context.Context, domain string) (*models.Node, error) {
	nodes, err := r.List(ctx)
	if err != nil {
		return nil, err
	}

	// Check each node's domain list
	for _, node := range nodes {
		// Check primary domain (PublicURL)
		if extractDomain(node.PublicURL) == domain {
			n := node
			return &n, nil
		}

		// Check additional domains
		for _, d := range node.Domains {
			if d == domain {
				n := node
				return &n, nil
			}
		}
	}

	return nil, nil // No node found for this domain
}

// extractDomain extracts domain from URL (e.g., "https://example.com/path" -> "example.com")
func extractDomain(urlStr string) string {
	// Simple extraction: remove protocol and path
	// For production, use url.Parse
	domain := urlStr
	if len(domain) > 8 && domain[:8] == "https://" {
		domain = domain[8:]
	} else if len(domain) > 7 && domain[:7] == "http://" {
		domain = domain[7:]
	}

	// Remove path if exists
	for i, c := range domain {
		if c == '/' || c == ':' {
			domain = domain[:i]
			break
		}
	}

	return domain
}
