package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/afuzapratama/nexuslink/internal/models"
	"github.com/afuzapratama/nexuslink/internal/repository"
	"github.com/afuzapratama/nexuslink/internal/webhook"
	"github.com/skip2/go-qrcode"
)

type LinkHandler struct {
	linkRepo      *repository.LinkRepository
	statsRepo     *repository.LinkStatsRepository
	clickRepo     *repository.ClickRepository
	webhookRepo   *repository.WebhookRepository
	webhookSender *webhook.Sender
}

func NewLinkHandler(
	linkRepo *repository.LinkRepository,
	statsRepo *repository.LinkStatsRepository,
	clickRepo *repository.ClickRepository,
	webhookRepo *repository.WebhookRepository,
	webhookSender *webhook.Sender,
) *LinkHandler {
	return &LinkHandler{
		linkRepo:      linkRepo,
		statsRepo:     statsRepo,
		clickRepo:     clickRepo,
		webhookRepo:   webhookRepo,
		webhookSender: webhookSender,
	}
}

// GET /links, POST /links
func (h *LinkHandler) HandleLinks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listLinks(w, r)
	case http.MethodPost:
		h.createLink(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *LinkHandler) listLinks(w http.ResponseWriter, r *http.Request) {
	// Parse pagination params
	page := 1
	limit := 10
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	links, total, err := h.linkRepo.ListPaginated(r.Context(), page, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Filter by groupId if provided (note: filtering after pagination, untuk simplicity)
	groupID := r.URL.Query().Get("groupId")
	if groupID != "" {
		var filtered []models.Link
		for _, link := range links {
			if link.GroupID == groupID {
				filtered = append(filtered, link)
			}
		}
		links = filtered
		// Note: total tidak akurat setelah filter, tapi untuk MVP ini cukup
	}

	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":       links,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": totalPages,
	})
}

func (h *LinkHandler) createLink(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Alias     string `json:"alias"`
		TargetURL string `json:"targetUrl"`
		NodeID    string `json:"nodeId"`
		GroupID   string `json:"groupId"`
		Domain    string `json:"domain"`

		AllowedOS        []string `json:"allowedOs"`
		AllowedDevices   []string `json:"allowedDevices"`
		AllowedBrowsers  []string `json:"allowedBrowsers"`
		AllowedCountries []string `json:"allowedCountries"`
		BlockBots        bool     `json:"blockBots"`
		FallbackURL      string   `json:"fallbackUrl"`
		ExpiresAt        *string  `json:"expiresAt"`
		MaxClicks        *int     `json:"maxClicks"`
		ActiveFrom       *string  `json:"activeFrom"`
		ActiveUntil      *string  `json:"activeUntil"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	alias := strings.TrimSpace(input.Alias)
	target := strings.TrimSpace(input.TargetURL)

	if alias == "" || target == "" {
		http.Error(w, "alias and targetUrl required", http.StatusBadRequest)
		return
	}

	link := &models.Link{
		Alias:     alias,
		TargetURL: target,
		NodeID:    strings.TrimSpace(input.NodeID),
		GroupID:   strings.TrimSpace(input.GroupID),
		Domain:    strings.TrimSpace(input.Domain),

		AllowedOS:        input.AllowedOS,
		AllowedDevices:   input.AllowedDevices,
		AllowedBrowsers:  input.AllowedBrowsers,
		AllowedCountries: input.AllowedCountries,
		BlockBots:        input.BlockBots,
		FallbackURL:      strings.TrimSpace(input.FallbackURL),
	}

	log.Printf("Creating link: alias=%s, allowedCountries=%v, len=%d", alias, input.AllowedCountries, len(input.AllowedCountries))
	log.Printf("Link struct allowedCountries=%v", link.AllowedCountries)

	// Parse expiration
	if input.ExpiresAt != nil && *input.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *input.ExpiresAt)
		if err != nil {
			http.Error(w, "invalid expiresAt format (use ISO 8601)", http.StatusBadRequest)
			return
		}
		link.ExpiresAt = &t
	}

	// Set max clicks
	if input.MaxClicks != nil && *input.MaxClicks > 0 {
		link.MaxClicks = input.MaxClicks
	}

	// Parse schedule: activeFrom
	if input.ActiveFrom != nil && *input.ActiveFrom != "" {
		t, err := time.Parse(time.RFC3339, *input.ActiveFrom)
		if err != nil {
			http.Error(w, "invalid activeFrom format (use ISO 8601)", http.StatusBadRequest)
			return
		}
		link.ActiveFrom = &t
	}

	// Parse schedule: activeUntil
	if input.ActiveUntil != nil && *input.ActiveUntil != "" {
		t, err := time.Parse(time.RFC3339, *input.ActiveUntil)
		if err != nil {
			http.Error(w, "invalid activeUntil format (use ISO 8601)", http.StatusBadRequest)
			return
		}
		link.ActiveUntil = &t
	}

	// Validate schedule logic
	if link.ActiveFrom != nil && link.ActiveUntil != nil && link.ActiveFrom.After(*link.ActiveUntil) {
		http.Error(w, "activeFrom must be before activeUntil", http.StatusBadRequest)
		return
	}

	if err := h.linkRepo.Create(r.Context(), link); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Trigger link.created webhook
	go h.triggerWebhook(r.Context(), models.EventLinkCreated, map[string]interface{}{
		"linkId":    link.ID,
		"alias":     link.Alias,
		"targetUrl": link.TargetURL,
		"groupId":   link.GroupID,
		"timestamp": time.Now().Format(time.RFC3339),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(link)
}

// GET /links/:alias/qr - Generate QR code for link
func (h *LinkHandler) HandleQRCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Extract alias from URL path
	// Expecting: /links/ALIAS/qr
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 || parts[0] != "links" || parts[2] != "qr" {
		http.NotFound(w, r)
		return
	}
	alias := parts[1]

	// Check if link exists
	link, err := h.linkRepo.GetByAlias(r.Context(), alias)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if link == nil {
		http.NotFound(w, r)
		return
	}

	// Get size from query param (default: 256)
	sizeStr := r.URL.Query().Get("size")
	size := 256
	if sizeStr != "" {
		if s, err := strconv.Atoi(sizeStr); err == nil && s >= 64 && s <= 1024 {
			size = s
		}
	}

	// Build short URL (hardcoded for now, should be from config)
	shortURL := fmt.Sprintf("https://yourdomain.com/r/%s", alias)

	// Generate QR code
	png, err := qrcode.Encode(shortURL, qrcode.Medium, size)
	if err != nil {
		http.Error(w, "failed to generate QR code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=86400") // Cache for 1 day
	w.Write(png)
}

// POST /links/bulk/toggle - Bulk enable/disable links
func (h *LinkHandler) HandleBulkToggle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Aliases  []string `json:"aliases"`
		IsActive bool     `json:"isActive"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(input.Aliases) == 0 {
		http.Error(w, "aliases array is required", http.StatusBadRequest)
		return
	}

	// Update each link
	updated := 0
	failed := 0
	for _, alias := range input.Aliases {
		if err := h.toggleLink(r.Context(), alias, input.IsActive); err != nil {
			failed++
			log.Printf("Failed to toggle link %s: %v", alias, err)
		} else {
			updated++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"updated": updated,
		"failed":  failed,
		"total":   len(input.Aliases),
	})
}

func (h *LinkHandler) toggleLink(ctx context.Context, alias string, isActive bool) error {
	link, err := h.linkRepo.GetByAlias(ctx, alias)
	if err != nil || link == nil {
		return fmt.Errorf("link not found: %s", alias)
	}

	link.IsActive = isActive
	link.UpdatedAt = time.Now()

	return h.linkRepo.Update(ctx, link)
}

// POST /links/bulk/delete - Bulk delete links
func (h *LinkHandler) HandleBulkDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Aliases []string `json:"aliases"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(input.Aliases) == 0 {
		http.Error(w, "aliases array is required", http.StatusBadRequest)
		return
	}

	// Delete each link
	deleted := 0
	failed := 0
	for _, alias := range input.Aliases {
		link, err := h.linkRepo.GetByAlias(r.Context(), alias)
		if err != nil || link == nil {
			failed++
			log.Printf("Failed to find link for deletion %s: %v", alias, err)
			continue
		}

		if err := h.linkRepo.Delete(r.Context(), link.ID); err != nil {
			failed++
			log.Printf("Failed to delete link %s: %v", alias, err)
			continue
		}
		deleted++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deleted": deleted,
		"failed":  failed,
		"total":   len(input.Aliases),
	})
}

// triggerWebhook triggers all active webhooks subscribed to an event
func (h *LinkHandler) triggerWebhook(ctx context.Context, event string, data map[string]interface{}) {
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

// HandleLinkByAlias handles PUT and DELETE for individual links
// PUT /links/:alias - Update link
// DELETE /links/:alias - Delete link
func (h *LinkHandler) HandleLinkByAlias(w http.ResponseWriter, r *http.Request) {
	// Extract alias from URL path: /links/ALIAS
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 || parts[0] != "links" {
		http.NotFound(w, r)
		return
	}
	alias := parts[1]

	switch r.Method {
	case http.MethodPut:
		h.updateLink(w, r, alias)
	case http.MethodDelete:
		h.deleteLink(w, r, alias)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *LinkHandler) updateLink(w http.ResponseWriter, r *http.Request, alias string) {
	// Get existing link
	existingLink, err := h.linkRepo.GetByAlias(r.Context(), alias)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if existingLink == nil {
		http.Error(w, "link not found", http.StatusNotFound)
		return
	}

	// Parse update request
	var input struct {
		TargetURL        string   `json:"targetUrl"`
		NodeID           string   `json:"nodeId"`
		GroupID          string   `json:"groupId"`
		Domain           string   `json:"domain"`
		AllowedOS        []string `json:"allowedOs"`
		AllowedDevices   []string `json:"allowedDevices"`
		AllowedBrowsers  []string `json:"allowedBrowsers"`
		AllowedCountries []string `json:"allowedCountries"`
		BlockBots        bool     `json:"blockBots"`
		FallbackURL      string   `json:"fallbackUrl"`
		ExpiresAt        *string  `json:"expiresAt"`
		MaxClicks        *int     `json:"maxClicks"`
		ActiveFrom       *string  `json:"activeFrom"`
		ActiveUntil      *string  `json:"activeUntil"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// Update fields
	target := strings.TrimSpace(input.TargetURL)
	if target == "" {
		http.Error(w, "targetUrl required", http.StatusBadRequest)
		return
	}

	existingLink.TargetURL = target
	existingLink.NodeID = strings.TrimSpace(input.NodeID)
	existingLink.GroupID = strings.TrimSpace(input.GroupID)
	existingLink.Domain = strings.TrimSpace(input.Domain)
	existingLink.AllowedOS = input.AllowedOS
	existingLink.AllowedDevices = input.AllowedDevices
	existingLink.AllowedBrowsers = input.AllowedBrowsers
	existingLink.AllowedCountries = input.AllowedCountries
	existingLink.BlockBots = input.BlockBots
	existingLink.FallbackURL = strings.TrimSpace(input.FallbackURL)

	// Parse expiration
	if input.ExpiresAt != nil && *input.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *input.ExpiresAt)
		if err != nil {
			http.Error(w, "invalid expiresAt format (use ISO 8601)", http.StatusBadRequest)
			return
		}
		existingLink.ExpiresAt = &t
	} else {
		existingLink.ExpiresAt = nil
	}

	// Set max clicks
	if input.MaxClicks != nil && *input.MaxClicks > 0 {
		existingLink.MaxClicks = input.MaxClicks
	} else {
		existingLink.MaxClicks = nil
	}

	// Parse schedule: activeFrom
	if input.ActiveFrom != nil && *input.ActiveFrom != "" {
		t, err := time.Parse(time.RFC3339, *input.ActiveFrom)
		if err != nil {
			http.Error(w, "invalid activeFrom format (use ISO 8601)", http.StatusBadRequest)
			return
		}
		existingLink.ActiveFrom = &t
	} else {
		existingLink.ActiveFrom = nil
	}

	// Parse schedule: activeUntil
	if input.ActiveUntil != nil && *input.ActiveUntil != "" {
		t, err := time.Parse(time.RFC3339, *input.ActiveUntil)
		if err != nil {
			http.Error(w, "invalid activeUntil format (use ISO 8601)", http.StatusBadRequest)
			return
		}
		existingLink.ActiveUntil = &t
	} else {
		existingLink.ActiveUntil = nil
	}

	// Validate schedule logic
	if existingLink.ActiveFrom != nil && existingLink.ActiveUntil != nil && existingLink.ActiveFrom.After(*existingLink.ActiveUntil) {
		http.Error(w, "activeFrom must be before activeUntil", http.StatusBadRequest)
		return
	}

	// Update in database
	if err := h.linkRepo.Update(r.Context(), existingLink); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Trigger link.updated webhook
	go h.triggerWebhook(r.Context(), "link.updated", map[string]interface{}{
		"linkId":    existingLink.ID,
		"alias":     existingLink.Alias,
		"targetUrl": existingLink.TargetURL,
		"groupId":   existingLink.GroupID,
		"timestamp": time.Now().Format(time.RFC3339),
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existingLink)
}

func (h *LinkHandler) deleteLink(w http.ResponseWriter, r *http.Request, alias string) {
	// Check if link exists
	existingLink, err := h.linkRepo.GetByAlias(r.Context(), alias)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if existingLink == nil {
		http.Error(w, "link not found", http.StatusNotFound)
		return
	}

	// Delete link by ID (repository expects ID not alias)
	if err := h.linkRepo.Delete(r.Context(), existingLink.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete associated analytics data (LinkStats and ClickEvents)
	if err := h.statsRepo.DeleteByLinkAlias(r.Context(), alias); err != nil {
		// Log error but don't fail the request
		log.Printf("Warning: failed to delete stats for link %s: %v", alias, err)
	}

	if err := h.clickRepo.DeleteByLinkAlias(r.Context(), alias); err != nil {
		// Log error but don't fail the request
		log.Printf("Warning: failed to delete click events for link %s: %v", alias, err)
	}

	// Trigger link.deleted webhook
	go h.triggerWebhook(r.Context(), "link.deleted", map[string]interface{}{
		"linkId":    existingLink.ID,
		"alias":     existingLink.Alias,
		"timestamp": time.Now().Format(time.RFC3339),
	})

	w.WriteHeader(http.StatusNoContent)
}
