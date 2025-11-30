package ipcheck

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// IPQSResult hasil dari IPQualityScore API
type IPQSResult struct {
	IsProxy     bool   `json:"isProxy"`
	IsVPN       bool   `json:"isVpn"`
	IsTor       bool   `json:"isTor"`
	IsBot       bool   `json:"isBot"`
	FraudScore  int    `json:"fraudScore"` // 0-100
	CountryCode string `json:"countryCode"`
}

// IPQSAPIResponse response dari IPQualityScore API
type IPQSAPIResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	FraudScore  int    `json:"fraud_score"`
	CountryCode string `json:"country_code"`
	Proxy       bool   `json:"proxy"`
	VPN         bool   `json:"vpn"`
	TOR         bool   `json:"tor"`
	Bot         bool   `json:"bot_status"`
	RecentAbuse bool   `json:"recent_abuse"`
	ActiveVPN   bool   `json:"active_vpn"`
	ActiveTor   bool   `json:"active_tor"`
}

// CheckIPWithIPQS melakukan pengecekan IP menggunakan IPQualityScore API
// API doc: https://www.ipqualityscore.com/documentation/proxy-detection/overview
func CheckIPWithIPQS(ctx context.Context, ip, apiKey string) (*IPQSResult, error) {
	if ip == "" {
		return nil, fmt.Errorf("ip address is required")
	}
	if apiKey == "" {
		return nil, fmt.Errorf("api key is required")
	}

	// Build URL
	// Format: https://ipqualityscore.com/api/json/ip/{apiKey}/{ip}?strictness=0&allow_public_access_points=true
	url := fmt.Sprintf("https://ipqualityscore.com/api/json/ip/%s/%s?strictness=0&allow_public_access_points=true", apiKey, ip)

	// Create HTTP request dengan context
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ipqs api call failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ipqs api returned status %d", resp.StatusCode)
	}

	// Parse JSON response
	var apiResp IPQSAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("parse response failed: %w", err)
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("ipqs api error: %s", apiResp.Message)
	}

	// Map ke result struct
	result := &IPQSResult{
		IsProxy:     apiResp.Proxy || apiResp.VPN || apiResp.ActiveVPN,
		IsVPN:       apiResp.VPN || apiResp.ActiveVPN,
		IsTor:       apiResp.TOR || apiResp.ActiveTor,
		IsBot:       apiResp.Bot,
		FraudScore:  apiResp.FraudScore,
		CountryCode: apiResp.CountryCode,
	}

	return result, nil
}
