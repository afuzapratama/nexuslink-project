package models

import "time"

type NodeToken struct {
	Token     string    `json:"token" dynamodbav:"token"`
	Label     string    `json:"label" dynamodbav:"label"`
	CreatedAt time.Time `json:"createdAt" dynamodbav:"createdAt"`
	IsUsed    bool      `json:"isUsed" dynamodbav:"isUsed"`
	UsedAt    time.Time `json:"usedAt,omitempty" dynamodbav:"usedAt,omitempty"`
}
