package models

import "time"

type LinkGroup struct {
	ID          string    `json:"id" dynamodbav:"id"`
	Name        string    `json:"name" dynamodbav:"name"`
	Description string    `json:"description,omitempty" dynamodbav:"description,omitempty"`
	Color       string    `json:"color,omitempty" dynamodbav:"color,omitempty"` // Hex color for UI (#3b82f6)
	Icon        string    `json:"icon,omitempty" dynamodbav:"icon,omitempty"`   // Icon name or emoji
	SortOrder   int       `json:"sortOrder" dynamodbav:"sortOrder"`             // For custom ordering
	CreatedAt   time.Time `json:"createdAt" dynamodbav:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" dynamodbav:"updatedAt"`
}
