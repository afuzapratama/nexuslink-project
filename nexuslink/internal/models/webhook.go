package models

import "time"

// Webhook represents a webhook endpoint for event notifications
type Webhook struct {
	ID        string    `json:"id" dynamodbav:"id"`               // UUID
	URL       string    `json:"url" dynamodbav:"url"`             // Webhook endpoint URL
	Events    []string  `json:"events" dynamodbav:"events"`       // Event types to subscribe to
	Secret    string    `json:"secret" dynamodbav:"secret"`       // Secret for HMAC signature
	IsActive  bool      `json:"isActive" dynamodbav:"isActive"`   // Whether webhook is enabled
	CreatedAt time.Time `json:"createdAt" dynamodbav:"createdAt"` // Creation timestamp
	UpdatedAt time.Time `json:"updatedAt" dynamodbav:"updatedAt"` // Last update timestamp
}

// Supported webhook event types
const (
	EventClickCreated   = "click.created"   // New click event
	EventNodeOffline    = "node.offline"    // Node went offline
	EventTrafficBlocked = "traffic.blocked" // Traffic blocked by rate limit
	EventLinkExpired    = "link.expired"    // Link reached expiration
	EventLinkMaxClicks  = "link.maxclicks"  // Link reached max clicks
	EventLinkCreated    = "link.created"    // New link created
	EventLinkUpdated    = "link.updated"    // Link updated
	EventLinkDeleted    = "link.deleted"    // Link deleted
)

// WebhookPayload represents the payload sent to webhook endpoint
type WebhookPayload struct {
	Event     string                 `json:"event"`     // Event type
	Timestamp time.Time              `json:"timestamp"` // Event timestamp
	Data      map[string]interface{} `json:"data"`      // Event-specific data
}
