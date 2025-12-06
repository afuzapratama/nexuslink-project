package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/afuzapratama/nexuslink/internal/geoip"
	"github.com/afuzapratama/nexuslink/internal/ipcheck"
	"github.com/afuzapratama/nexuslink/internal/models"
	"github.com/afuzapratama/nexuslink/internal/repository"
	"github.com/afuzapratama/nexuslink/internal/ua"
	"github.com/afuzapratama/nexuslink/internal/util"
	"github.com/afuzapratama/nexuslink/internal/webhook"
)

type ResolverHandler struct {
	linkRepo      *repository.LinkRepository
	statsRepo     *repository.LinkStatsRepository
	clickRepo     *repository.ClickRepository
	settingsRepo  *repository.SettingsRepository
	webhookRepo   *repository.WebhookRepository
	webhookSender *webhook.Sender
	variantRepo   *repository.LinkVariantRepository
}

func NewResolverHandler(
	linkRepo *repository.LinkRepository,
	statsRepo *repository.LinkStatsRepository,
	clickRepo *repository.ClickRepository,
	settingsRepo *repository.SettingsRepository,
	webhookRepo *repository.WebhookRepository,
	webhookSender *webhook.Sender,
	variantRepo *repository.LinkVariantRepository,
) *ResolverHandler {
	return &ResolverHandler{
		linkRepo:      linkRepo,
		statsRepo:     statsRepo,
		clickRepo:     clickRepo,
		settingsRepo:  settingsRepo,
		webhookRepo:   webhookRepo,
		webhookSender: webhookSender,
		variantRepo:   variantRepo,
	}
}

// GET /links/resolve - Main resolver with all checks
func (h *ResolverHandler) HandleResolve(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	alias := strings.TrimSpace(r.URL.Query().Get("alias"))
	nodeID := strings.TrimSpace(r.URL.Query().Get("nodeId"))
	domain := strings.TrimSpace(r.URL.Query().Get("domain"))

	if alias == "" {
		http.Error(w, "alias is required", http.StatusBadRequest)
		return
	}

	// Get link
	link, err := h.linkRepo.GetByAlias(r.Context(), alias)
	if err != nil {
		log.Printf("linkRepo.GetByAlias error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if link == nil {
		http.NotFound(w, r)
		return
	}

	// --- Check domain restriction ---
	// If link has domain restriction and request domain doesn't match, deny access
	if link.Domain != "" && domain != "" && !strings.EqualFold(link.Domain, domain) {
		log.Printf("Domain mismatch: alias=%s, linkDomain=%s, requestDomain=%s", alias, link.Domain, domain)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "domain_not_allowed",
			})
			return
		}
		http.Error(w, "link not available on this domain", http.StatusForbidden)
		return
	}

	// --- Check link schedule (activeFrom / activeUntil) ---
	now := time.Now()
	if link.ActiveFrom != nil && now.Before(*link.ActiveFrom) {
		log.Printf("Link not yet active: alias=%s, activeFrom=%v, now=%v", alias, link.ActiveFrom, now)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "not_yet_active",
			})
			return
		}
		http.Error(w, "link is not yet active", http.StatusForbidden)
		return
	}

	if link.ActiveUntil != nil && now.After(*link.ActiveUntil) {
		log.Printf("Link schedule ended: alias=%s, activeUntil=%v, now=%v", alias, link.ActiveUntil, now)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "schedule_ended",
			})
			return
		}
		http.Error(w, "link schedule has ended", http.StatusGone)
		return
	}

	// --- Check link expiration ---
	if link.ExpiresAt != nil && time.Now().After(*link.ExpiresAt) {
		log.Printf("Link expired: alias=%s, expiresAt=%v", alias, link.ExpiresAt)

		// Trigger link.expired webhook
		go h.triggerWebhook(r.Context(), models.EventLinkExpired, map[string]interface{}{
			"linkId":    link.ID,
			"alias":     link.Alias,
			"targetUrl": link.TargetURL,
			"expiresAt": link.ExpiresAt.Format(time.RFC3339),
			"timestamp": time.Now().Format(time.RFC3339),
		})

		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "expired",
			})
			return
		}
		http.Error(w, "link expired", http.StatusGone)
		return
	}

	// --- Check max clicks limit ---
	if link.MaxClicks != nil {
		stat, err := h.statsRepo.Get(r.Context(), nodeID, alias)
		if err == nil && stat != nil && stat.HitCount >= int64(*link.MaxClicks) {
			log.Printf("Link max clicks reached: alias=%s, maxClicks=%d", alias, *link.MaxClicks)

			// Trigger link.maxclicks webhook
			go h.triggerWebhook(r.Context(), models.EventLinkMaxClicks, map[string]interface{}{
				"linkId":      link.ID,
				"alias":       link.Alias,
				"targetUrl":   link.TargetURL,
				"maxClicks":   *link.MaxClicks,
				"totalClicks": stat.HitCount,
				"timestamp":   time.Now().Format(time.RFC3339),
			})

			if strings.TrimSpace(link.FallbackURL) != "" {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{
					"target": link.FallbackURL,
					"reason": "max_clicks_reached",
				})
				return
			}
			http.Error(w, "link has reached maximum clicks", http.StatusForbidden)
			return
		}
	}

	// --- Increment hit count ---
	if err := h.statsRepo.IncrementHit(r.Context(), nodeID, alias); err != nil {
		log.Printf("increment link stat failed: %v", err)
	}

	// --- Get visitor info from headers ---
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
		if idx := strings.Index(ip, ","); idx > 0 {
			ip = strings.TrimSpace(ip[:idx])
		}
	}
	if ip == "" {
		ip = strings.Split(r.RemoteAddr, ":")[0]
	}

	userAgent := r.Header.Get("X-Visitor-User-Agent")
	if userAgent == "" {
		userAgent = r.UserAgent()
	}

	referer := r.Header.Get("X-Visitor-Referer")
	if referer == "" {
		referer = r.Referer()
	}

	// Parse User-Agent (returns 5 values: os, device, browser, isBot, botType)
	osName, deviceType, browserName, isBot, botType := ua.Parse(userAgent)

	// Get global settings for IP check (returns Settings, no error)
	settings := h.settingsRepo.GetOrDefault(r.Context())

	// Initialize click event
	clickEvent := &models.ClickEvent{
		Alias:      alias,
		NodeID:     nodeID,
		IP:         ip,
		UserAgent:  userAgent,
		Referrer:   referer,
		OS:         osName,
		Device:     deviceType,
		Browser:    browserName,
		IsBot:      isBot,
		BotType:    botType,
		FraudScore: 0,
		RiskScore:  0,
	}

	// Check if bot should be blocked
	if link.BlockBots && isBot {
		log.Printf("Bot blocked: alias=%s, botType=%s, userAgent=%s", alias, botType, userAgent)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "bot_blocked",
			})
			// Still log the click event
			h.clickRepo.LogClick(r.Context(), clickEvent)
			return
		}
		http.Error(w, "bot access blocked", http.StatusForbidden)
		h.clickRepo.LogClick(r.Context(), clickEvent)
		return
	}

	// IP Quality checks
	blocked := false
	blockReason := ""

	// ProxyCheck.io
	if settings.EnableProxyCheck && strings.TrimSpace(settings.ProxyCheckAPIKey) != "" {
		result, err := ipcheck.CheckIPWithProxyCheck(r.Context(), ip, settings.ProxyCheckAPIKey)
		if err != nil {
			log.Printf("ProxyCheck failed: %v", err)
		} else {
			clickEvent.IsVPN = result.IsVPN
			clickEvent.IsTor = result.IsTor
			clickEvent.IsProxy = result.IsProxy
			clickEvent.RiskScore = result.RiskScore
			clickEvent.IPCheckProvider = "proxycheck"
			clickEvent.Country = result.CountryCode

			// Check blocking rules
			if settings.BlockVPN && result.IsVPN {
				blocked = true
				blockReason = "vpn_blocked"
			} else if settings.BlockTor && result.IsTor {
				blocked = true
				blockReason = "tor_blocked"
			} else if settings.BlockProxies && result.IsProxy {
				blocked = true
				blockReason = "proxy_blocked"
			}

			log.Printf("ProxyCheck result: ip=%s, vpn=%v, tor=%v, proxy=%v, risk=%d",
				ip, result.IsVPN, result.IsTor, result.IsProxy, result.RiskScore)
		}
	}

	// IPQualityScore (overrides ProxyCheck if enabled)
	if settings.EnableIPQualityScore && strings.TrimSpace(settings.IPQualityScoreAPIKey) != "" {
		result, err := ipcheck.CheckIPWithIPQS(r.Context(), ip, settings.IPQualityScoreAPIKey)
		if err != nil {
			log.Printf("IPQS failed: %v", err)
		} else {
			clickEvent.IsVPN = result.IsVPN
			clickEvent.IsTor = result.IsTor
			clickEvent.IsProxy = result.IsProxy
			clickEvent.FraudScore = result.FraudScore
			clickEvent.IPCheckProvider = "ipqualityscore"
			clickEvent.Country = result.CountryCode

			// Check blocking rules
			if settings.BlockVPN && result.IsVPN {
				blocked = true
				blockReason = "vpn_blocked"
			} else if settings.BlockTor && result.IsTor {
				blocked = true
				blockReason = "tor_blocked"
			} else if settings.BlockProxies && result.IsProxy {
				blocked = true
				blockReason = "proxy_blocked"
			} else if settings.BlockBots && result.IsBot {
				blocked = true
				blockReason = "bot_blocked"
			}

			log.Printf("IPQS result: ip=%s, vpn=%v, tor=%v, proxy=%v, bot=%v, fraud=%d",
				ip, result.IsVPN, result.IsTor, result.IsProxy, result.IsBot, result.FraudScore)
		}
	}

	// Fallback to MaxMind GeoIP if country not set from IP quality checks
	if clickEvent.Country == "" {
		countryCode, city := geoip.Lookup(ip)
		clickEvent.Country = countryCode
		clickEvent.City = city
		log.Printf("GeoIP lookup: ip=%s, country=%s, city=%s", ip, countryCode, city)
	}

	// Handle blocking
	if blocked {
		log.Printf("Traffic blocked: ip=%s, reason=%s", ip, blockReason)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": blockReason,
			})
			h.clickRepo.LogClick(r.Context(), clickEvent)
			return
		}
		http.Error(w, "access blocked", http.StatusForbidden)
		h.clickRepo.LogClick(r.Context(), clickEvent)
		return
	}

	// Check OS/Device/Browser rules
	// For OS, use contains check because parser returns "Windows 10", "Windows 11", etc.
	// but filter is just "Windows"
	if len(link.AllowedOS) > 0 && !containsOS(link.AllowedOS, osName) {
		log.Printf("OS mismatch: alias=%s, got=%s, allowed=%v", alias, osName, link.AllowedOS)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "os_not_allowed",
			})
			h.clickRepo.LogClick(r.Context(), clickEvent)
			return
		}
		http.Error(w, "OS not allowed", http.StatusForbidden)
		h.clickRepo.LogClick(r.Context(), clickEvent)
		return
	}

	if len(link.AllowedDevices) > 0 && !contains(link.AllowedDevices, deviceType) {
		log.Printf("Device mismatch: alias=%s, got=%s, allowed=%v", alias, deviceType, link.AllowedDevices)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "device_not_allowed",
			})
			h.clickRepo.LogClick(r.Context(), clickEvent)
			return
		}
		http.Error(w, "device not allowed", http.StatusForbidden)
		h.clickRepo.LogClick(r.Context(), clickEvent)
		return
	}

	if len(link.AllowedBrowsers) > 0 && !contains(link.AllowedBrowsers, browserName) {
		log.Printf("Browser mismatch: alias=%s, got=%s, allowed=%v", alias, browserName, link.AllowedBrowsers)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "browser_not_allowed",
			})
			h.clickRepo.LogClick(r.Context(), clickEvent)
			return
		}
		http.Error(w, "browser not allowed", http.StatusForbidden)
		h.clickRepo.LogClick(r.Context(), clickEvent)
		return
	}

	// Check country restriction
	if len(link.AllowedCountries) > 0 && !contains(link.AllowedCountries, clickEvent.Country) {
		log.Printf("Country mismatch: alias=%s, got=%s, allowed=%v", alias, clickEvent.Country, link.AllowedCountries)
		if strings.TrimSpace(link.FallbackURL) != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"target": link.FallbackURL,
				"reason": "country_not_allowed",
			})
			h.clickRepo.LogClick(r.Context(), clickEvent)
			return
		}
		http.Error(w, "country not allowed", http.StatusForbidden)
		h.clickRepo.LogClick(r.Context(), clickEvent)
		return
	}

	// Log successful click
	if err := h.clickRepo.LogClick(r.Context(), clickEvent); err != nil {
		log.Printf("Failed to log click: %v", err)
	}

	// Trigger click.created webhook
	go h.triggerWebhook(r.Context(), models.EventClickCreated, map[string]interface{}{
		"linkId":      link.ID,
		"alias":       link.Alias,
		"targetUrl":   link.TargetURL,
		"nodeId":      nodeID,
		"ipAddress":   ip,
		"userAgent":   userAgent,
		"referer":     referer,
		"country":     clickEvent.Country,
		"city":        clickEvent.City,
		"deviceType":  deviceType,
		"osName":      osName,
		"browserName": browserName,
		"isBot":       isBot,
		"timestamp":   time.Now().Format(time.RFC3339),
	})

	// Check for A/B testing variants
	targetURL := link.TargetURL
	selectedVariantID := ""

	variants, err := h.variantRepo.GetByLinkID(r.Context(), link.Alias)
	if err != nil {
		log.Printf("Error fetching variants for link %s: %v", link.Alias, err)
	} else if len(variants) > 0 {
		// Use weighted selection to choose a variant
		selectedVariant := util.SelectVariantByWeight(variants)
		if selectedVariant != nil {
			targetURL = selectedVariant.TargetURL
			selectedVariantID = selectedVariant.ID

			// Increment variant click count asynchronously
			go func(vID string) {
				if err := h.variantRepo.IncrementClicks(context.Background(), link.Alias, vID); err != nil {
					log.Printf("Failed to increment variant clicks: %v", err)
				}
			}(selectedVariantID)

			log.Printf("A/B Test: Selected variant %s (weight: %d) for link %s",
				selectedVariant.Label, selectedVariant.Weight, link.Alias)
		}
	}

	// Return target URL with optional variant ID (for conversion tracking)
	response := map[string]string{
		"targetUrl": targetURL,
	}
	if selectedVariantID != "" {
		response["variantId"] = selectedVariantID
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}

// containsOS checks if OS name matches allowed list
// Uses partial match: "Windows 10" matches "Windows", "Linux x86_64" matches "Linux"
func containsOS(allowedOS []string, detectedOS string) bool {
	if detectedOS == "" {
		return false
	}

	detectedLower := strings.ToLower(detectedOS)
	// Normalize: remove spaces and special chars for better matching
	detectedNormalized := strings.ReplaceAll(strings.ReplaceAll(detectedLower, " ", ""), "_", "")

	for _, allowed := range allowedOS {
		allowedLower := strings.ToLower(allowed)
		allowedNormalized := strings.ReplaceAll(strings.ReplaceAll(allowedLower, " ", ""), "_", "")
		
		// Check if detected OS contains allowed OS name
		// e.g., "intelmacosх1015_7" contains "macos"
		// e.g., "windows10" contains "windows"
		if strings.Contains(detectedNormalized, allowedNormalized) {
			return true
		}
	}
	return false
}

// triggerWebhook triggers all active webhooks subscribed to an event
func (h *ResolverHandler) triggerWebhook(ctx context.Context, event string, data map[string]interface{}) {
	webhooks, err := h.webhookRepo.GetByEvent(ctx, event)
	if err != nil {
		log.Printf("Failed to get webhooks for event %s: %v", event, err)
		return
	}

	if len(webhooks) == 0 {
		return // No webhooks subscribed to this event
	}

	payload := &models.WebhookPayload{
		Event:     event,
		Timestamp: time.Now(),
		Data:      data,
	}

	// Send webhooks in background
	for _, wh := range webhooks {
		go func(w models.Webhook) {
			result, err := h.webhookSender.SendWebhook(ctx, &w, payload)
			if err != nil {
				log.Printf("Webhook error: event=%s url=%s error=%v", event, w.URL, err)
			} else if !result.Success {
				log.Printf("Webhook failed: event=%s url=%s status=%d", event, w.URL, result.StatusCode)
			} else {
				log.Printf("Webhook sent: event=%s url=%s status=%d", event, w.URL, result.StatusCode)
			}
		}(wh)
	}
}
