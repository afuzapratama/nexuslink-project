package models

import "time"

type Node struct {
	ID           string    `json:"id" dynamodbav:"id"`
	Name         string    `json:"name" dynamodbav:"name"`
	Region       string    `json:"region" dynamodbav:"region"`
	PublicURL    string    `json:"publicUrl" dynamodbav:"publicUrl"` // Primary domain (backward compatibility)
	Domains      []string  `json:"domains" dynamodbav:"domains"`     // Multiple domains this node serves
	LastSeenAt   time.Time `json:"lastSeenAt" dynamodbav:"lastSeenAt"`
	IsOnline     bool      `json:"isOnline" dynamodbav:"isOnline"`
	AgentVersion string    `json:"agentVersion" dynamodbav:"agentVersion"`
}
