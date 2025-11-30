package ipcheck

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ProxyCheckResult hasil dari ProxyCheck.io API
type ProxyCheckResult struct {
	IsProxy     bool   `json:"isProxy"`
	IsVPN       bool   `json:"isVpn"`
	IsTor       bool   `json:"isTor"`
	CountryCode string `json:"countryCode"`
	RiskScore   int    `json:"riskScore"` // 0-100
}

// ProxyCheckAPIResponse response dari API ProxyCheck.io
type ProxyCheckAPIResponse struct {
	Status string `json:"status"`
	IP     struct {
		Proxy       string `json:"proxy"` // "yes", "no"
		Type        string `json:"type"`  // "VPN", "TOR", "SOCKS", "HTTP", dll
		CountryCode string `json:"isocode"`
		Risk        int    `json:"risk"` // 0-100
	} `json:"-"` // field IP akan di-parse dynamic
}

// CheckIPWithProxyCheck melakukan pengecekan IP menggunakan ProxyCheck.io API
// API doc: https://proxycheck.io/api/
func CheckIPWithProxyCheck(ctx context.Context, ip, apiKey string) (*ProxyCheckResult, error) {
	if ip == "" {
		return nil, fmt.Errorf("ip address is required")
	}

	// Build URL dengan parameter
	// Format: https://proxycheck.io/v2/{ip}?key={apiKey}&vpn=1&asn=1
	url := fmt.Sprintf("https://proxycheck.io/v2/%s?vpn=1&asn=1", ip)
	if apiKey != "" {
		url += "&key=" + apiKey
	}

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
		return nil, fmt.Errorf("proxycheck api call failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("proxycheck api returned status %d", resp.StatusCode)
	}

	// Parse JSON response
	// Response format: { "status": "ok", "{ip}": { "proxy": "yes", "type": "VPN", ... } }
	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("parse response failed: %w", err)
	}

	status, _ := raw["status"].(string)
	if status != "ok" && status != "warning" {
		return nil, fmt.Errorf("proxycheck api status: %s", status)
	}

	// Ambil data IP (key = IP address)
	ipData, ok := raw[ip].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("ip data not found in response")
	}

	result := &ProxyCheckResult{
		IsProxy:     false,
		IsVPN:       false,
		IsTor:       false,
		CountryCode: "",
		RiskScore:   0,
	}

	// Parse "proxy" field
	if proxy, ok := ipData["proxy"].(string); ok && proxy == "yes" {
		result.IsProxy = true
	}

	// Parse "type" field (VPN, TOR, SOCKS, HTTP, dll)
	if proxyType, ok := ipData["type"].(string); ok {
		switch proxyType {
		case "VPN":
			result.IsVPN = true
		case "TOR":
			result.IsTor = true
		case "SOCKS", "SOCKS4", "SOCKS5", "HTTP", "HTTPS":
			result.IsProxy = true
		}
	}

	// Parse country code
	if isocode, ok := ipData["isocode"].(string); ok {
		result.CountryCode = isocode
	}

	// Parse risk score (0-100)
	if risk, ok := ipData["risk"].(float64); ok {
		result.RiskScore = int(risk)
	}

	return result, nil
}
