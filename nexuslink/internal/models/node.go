package models

import "time"

type Node struct {
	ID           string    `json:"id" dynamodbav:"id"`
	Name         string    `json:"name" dynamodbav:"name"`
	Region       string    `json:"region" dynamodbav:"region"`
	IPAddress    string    `json:"ipAddress" dynamodbav:"ipAddress"` // Detected IP address
	Domains      []string  `json:"domains" dynamodbav:"domains"`     // Domains this node serves
	LastSeenAt   time.Time `json:"lastSeenAt" dynamodbav:"lastSeenAt"`
	IsOnline     bool      `json:"isOnline" dynamodbav:"isOnline"`
	AgentVersion string    `json:"agentVersion" dynamodbav:"agentVersion"`
}
