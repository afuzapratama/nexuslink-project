package models

import "time"

// Settings menyimpan konfigurasi global untuk IP check & bot detection
// Singleton dengan ID = "global-settings"
type Settings struct {
	ID string `json:"id" dynamodbav:"id"` // selalu "global-settings"

	// ProxyCheck.io configuration
	EnableProxyCheck bool   `json:"enableProxyCheck" dynamodbav:"enableProxyCheck"`
	ProxyCheckAPIKey string `json:"proxyCheckApiKey,omitempty" dynamodbav:"proxyCheckApiKey,omitempty"`

	// IPQualityScore configuration
	EnableIPQualityScore bool   `json:"enableIpQualityScore" dynamodbav:"enableIpQualityScore"`
	IPQualityScoreAPIKey string `json:"ipQualityScoreApiKey,omitempty" dynamodbav:"ipQualityScoreApiKey,omitempty"`

	// Blocking rules
	BlockVPN     bool `json:"blockVpn" dynamodbav:"blockVpn"`
	BlockTor     bool `json:"blockTor" dynamodbav:"blockTor"`
	BlockProxies bool `json:"blockProxies" dynamodbav:"blockProxies"`
	BlockBots    bool `json:"blockBots" dynamodbav:"blockBots"` // global bot blocking

	// Rate limiting configuration
	RateLimitPerIP   int `json:"rateLimitPerIp" dynamodbav:"rateLimitPerIp"`     // requests per minute per IP
	RateLimitPerLink int `json:"rateLimitPerLink" dynamodbav:"rateLimitPerLink"` // requests per minute per link
	RateLimitWindow  int `json:"rateLimitWindow" dynamodbav:"rateLimitWindow"`   // window in seconds

	CreatedAt time.Time `json:"createdAt" dynamodbav:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" dynamodbav:"updatedAt"`
}

// DefaultSettings mengembalikan settings dengan nilai default
func DefaultSettings() *Settings {
	now := time.Now().UTC()
	return &Settings{
		ID:                   "global-settings",
		EnableProxyCheck:     false,
		ProxyCheckAPIKey:     "",
		EnableIPQualityScore: false,
		IPQualityScoreAPIKey: "",
		BlockVPN:             false,
		BlockTor:             false,
		BlockProxies:         false,
		BlockBots:            false,
		RateLimitPerIP:       60,  // 60 requests per minute
		RateLimitPerLink:     120, // 120 requests per minute
		RateLimitWindow:      60,  // 60 seconds window
		CreatedAt:            now,
		UpdatedAt:            now,
	}
}
