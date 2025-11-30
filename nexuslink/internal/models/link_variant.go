package models

import "time"

// LinkVariant represents an A/B testing variant for a link
// Multiple variants can exist for a single link, each with different target URLs
type LinkVariant struct {
	ID          string    `json:"id" dynamodbav:"id"`                   // Unique variant ID
	LinkID      string    `json:"linkId" dynamodbav:"linkId"`           // Parent link ID (alias)
	TargetURL   string    `json:"targetUrl" dynamodbav:"targetUrl"`     // Variant target URL
	Weight      int       `json:"weight" dynamodbav:"weight"`           // Weight percentage (0-100)
	Label       string    `json:"label" dynamodbav:"label"`             // Variant label (e.g., "Control", "Variant A")
	Clicks      int64     `json:"clicks" dynamodbav:"clicks"`           // Total clicks for this variant
	Conversions int64     `json:"conversions" dynamodbav:"conversions"` // Total conversions for this variant
	CreatedAt   time.Time `json:"createdAt" dynamodbav:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" dynamodbav:"updatedAt"`
}

// ConversionRate calculates the conversion rate as percentage
func (v *LinkVariant) ConversionRate() float64 {
	if v.Clicks == 0 {
		return 0.0
	}
	return (float64(v.Conversions) / float64(v.Clicks)) * 100.0
}
