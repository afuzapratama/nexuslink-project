package models

import "time"

type ClickEvent struct {
	ID     string `json:"id" dynamodbav:"id"`
	Alias  string `json:"alias" dynamodbav:"alias"`
	NodeID string `json:"nodeId" dynamodbav:"nodeId"`

	IP      string `json:"ip" dynamodbav:"ip"`
	Country string `json:"country" dynamodbav:"country"`
	City    string `json:"city" dynamodbav:"city"`

	OS      string `json:"os" dynamodbav:"os"`
	Device  string `json:"device" dynamodbav:"device"`
	Browser string `json:"browser" dynamodbav:"browser"`
	IsBot   bool   `json:"isBot" dynamodbav:"isBot"`
	BotType string `json:"botType,omitempty" dynamodbav:"botType,omitempty"` // Type of bot detected (googlebot, scrapy, etc)

	// IP Check results (from ProxyCheck or IPQualityScore)
	IsVPN           bool   `json:"isVpn,omitempty" dynamodbav:"isVpn,omitempty"`
	IsTor           bool   `json:"isTor,omitempty" dynamodbav:"isTor,omitempty"`
	IsProxy         bool   `json:"isProxy,omitempty" dynamodbav:"isProxy,omitempty"`
	FraudScore      int    `json:"fraudScore,omitempty" dynamodbav:"fraudScore,omitempty"`           // 0-100 from IPQS
	RiskScore       int    `json:"riskScore,omitempty" dynamodbav:"riskScore,omitempty"`             // 0-100 from ProxyCheck
	IPCheckProvider string `json:"ipCheckProvider,omitempty" dynamodbav:"ipCheckProvider,omitempty"` // "proxycheck" or "ipqualityscore"

	UserAgent string    `json:"userAgent" dynamodbav:"userAgent"`
	Referrer  string    `json:"referrer" dynamodbav:"referrer"`
	CreatedAt time.Time `json:"createdAt" dynamodbav:"createdAt"`
}
