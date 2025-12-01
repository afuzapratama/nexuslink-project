package models

import "time"

type Link struct {
	ID        string `json:"id" dynamodbav:"id"`
	Alias     string `json:"alias" dynamodbav:"alias"`
	TargetURL string `json:"targetUrl" dynamodbav:"targetUrl"`

	NodeID  string `json:"nodeId,omitempty" dynamodbav:"nodeId,omitempty"`
	GroupID string `json:"groupId,omitempty" dynamodbav:"groupId,omitempty"` // Link organization
	Domain  string `json:"domain,omitempty" dynamodbav:"domain,omitempty"`   // Domain restriction (optional, if empty = all domains)

	// --- NEW: aturan akses berbasis UA/IP ---

	// Allow-list; kalau kosong berarti bebas
	AllowedOS        []string `json:"allowedOs,omitempty" dynamodbav:"allowedOs,omitempty"`
	AllowedDevices   []string `json:"allowedDevices,omitempty" dynamodbav:"allowedDevices,omitempty"`
	AllowedBrowsers  []string `json:"allowedBrowsers,omitempty" dynamodbav:"allowedBrowsers,omitempty"`
	AllowedCountries []string `json:"allowedCountries,omitempty" dynamodbav:"allowedCountries,omitempty"` // ISO country codes (e.g., ["US", "ID", "SG"])

	// Kalau true dan UA terdeteksi bot → dianggap mismatch
	BlockBots bool `json:"blockBots,omitempty" dynamodbav:"blockBots,omitempty"`

	// Target alternatif kalau tidak sesuai rules
	FallbackURL string `json:"fallbackUrl,omitempty" dynamodbav:"fallbackUrl,omitempty"`

	// Advanced features
	ExpiresAt *time.Time `json:"expiresAt,omitempty" dynamodbav:"expiresAt,omitempty"` // Link expiration
	MaxClicks *int       `json:"maxClicks,omitempty" dynamodbav:"maxClicks,omitempty"` // Click limit

	// Scheduling - link only active within time range
	ActiveFrom  *time.Time `json:"activeFrom,omitempty" dynamodbav:"activeFrom,omitempty"`   // Link starts working from this time
	ActiveUntil *time.Time `json:"activeUntil,omitempty" dynamodbav:"activeUntil,omitempty"` // Link stops working after this time

	IsActive  bool      `json:"isActive" dynamodbav:"isActive"`
	CreatedAt time.Time `json:"createdAt" dynamodbav:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" dynamodbav:"updatedAt"`
}
