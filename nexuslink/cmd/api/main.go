package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/afuzapratama/nexuslink/internal/config"
	"github.com/afuzapratama/nexuslink/internal/database"
	"github.com/afuzapratama/nexuslink/internal/handler"
	"github.com/afuzapratama/nexuslink/internal/models"
	"github.com/afuzapratama/nexuslink/internal/ratelimit"
	"github.com/afuzapratama/nexuslink/internal/repository"
	"github.com/afuzapratama/nexuslink/internal/util"
	"github.com/afuzapratama/nexuslink/internal/webhook"
)

func main() {
	config.Init()

	log.Println("Nexus API starting...")

	log.Println("Ensuring DynamoDB tables...")
	if err := database.EnsureTables(context.Background()); err != nil {
		log.Fatalf("failed to ensure tables: %v", err)
	}
	log.Println("DynamoDB tables ready")

	// Initialize Redis for rate limiting analytics
	redisClient := database.GetRedisClient()
	var rateLimiter *ratelimit.Limiter
	if redisClient != nil {
		rateLimiter = ratelimit.NewLimiter(redisClient)
		log.Println("Rate limiter initialized for analytics")
	} else {
		log.Println("Redis not available, rate limit analytics disabled")
	}

	// Initialize repositories
	nodeRepo := repository.NewNodeRepository()
	statsRepo := repository.NewLinkStatsRepository()
	linkRepo := repository.NewLinkRepository()
	nodeTokenRepo := repository.NewNodeTokenRepository()
	clickRepo := repository.NewClickRepository()
	settingsRepo := repository.NewSettingsRepository()
	groupRepo := repository.NewLinkGroupRepository()
	webhookRepo := repository.NewWebhookRepository(database.Client(), database.WebhooksTableName)
	variantRepo := repository.NewLinkVariantRepository(database.Client())

	// Initialize webhook sender
	webhookSender := webhook.NewSender()

	// Initialize handlers
	linkHandler := handler.NewLinkHandler(linkRepo, statsRepo, clickRepo, webhookRepo, webhookSender)
	resolverHandler := handler.NewResolverHandler(linkRepo, statsRepo, clickRepo, settingsRepo, webhookRepo, webhookSender, variantRepo)
	variantHandler := handler.NewVariantHandler(variantRepo, linkRepo)

	mux := http.NewServeMux()

	// ======== MIGRATED TO HANDLERS ========

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK - Nexus API is running"))
	})

	// Link endpoints (migrated to handler)
	mux.HandleFunc("/links", handler.WithAgentAuth(linkHandler.HandleLinks))
	mux.HandleFunc("/links/bulk/toggle", handler.WithAgentAuth(linkHandler.HandleBulkToggle))
	mux.HandleFunc("/links/bulk/delete", handler.WithAgentAuth(linkHandler.HandleBulkDelete))

	// Combined handler for /links/:alias/* routes (QRCode, variants, convert, update, delete)
	mux.HandleFunc("/links/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/links/")
		parts := strings.Split(path, "/")

		// /links/:alias (PUT/DELETE for single link)
		if len(parts) == 1 && parts[0] != "" {
			handler.WithAgentAuth(linkHandler.HandleLinkByAlias)(w, r)
			return
		}

		if len(parts) >= 2 {
			// /links/:alias/variants or /links/:alias/variants/:id
			if parts[1] == "variants" {
				// Require auth for variant endpoints
				handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
					if len(parts) == 2 {
						// /links/:alias/variants
						if r.Method == http.MethodGet {
							variantHandler.HandleGetVariants(w, r)
						} else if r.Method == http.MethodPost {
							variantHandler.HandleCreateVariant(w, r)
						} else {
							http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
						}
					} else if len(parts) == 3 {
						// /links/:alias/variants/:id
						if r.Method == http.MethodPut {
							variantHandler.HandleUpdateVariant(w, r)
						} else if r.Method == http.MethodDelete {
							variantHandler.HandleDeleteVariant(w, r)
						} else {
							http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
						}
					} else {
						http.NotFound(w, r)
					}
				})(w, r)
				return
			}

			// /links/:alias/convert
			if parts[1] == "convert" {
				handler.WithAgentAuth(variantHandler.HandleConvert)(w, r)
				return
			}

			// /links/:alias/qr (QRCode handler - no auth)
			if parts[1] == "qr" {
				linkHandler.HandleQRCode(w, r)
				return
			}
		}

		// Default: not found
		http.NotFound(w, r)
	})

	// Resolver endpoint (migrated to handler)
	mux.HandleFunc("/links/resolve", handler.WithAgentAuth(resolverHandler.HandleResolve))

	// ======== TODO: MIGRATE THESE TO HANDLERS LATER ========

	// Analytics endpoints
	mux.HandleFunc("/analytics/clicks", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		alias := strings.TrimSpace(r.URL.Query().Get("alias"))
		if alias == "" {
			http.Error(w, "alias is required", http.StatusBadRequest)
			return
		}

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

		events, total, err := clickRepo.ListByAliasPaginated(r.Context(), alias, page, limit)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		totalPages := (total + limit - 1) / limit
		if totalPages < 1 {
			totalPages = 1
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data":       events,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		})
	}))

	// Get all clicks (for dashboard)
	mux.HandleFunc("/analytics/clicks/all", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Parse pagination params
		page := 1
		limit := 100
		if p := r.URL.Query().Get("page"); p != "" {
			if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
				page = parsed
			}
		}
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 1000 {
				limit = parsed
			}
		}

		events, total, err := clickRepo.ListAllPaginated(r.Context(), page, limit)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		totalPages := (total + limit - 1) / limit
		if totalPages < 1 {
			totalPages = 1
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data":       events,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		})
	}))

	// Node endpoints
	mux.HandleFunc("/nodes/heartbeat", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		var n models.Node
		if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if n.ID == "" {
			http.Error(w, "id is required", http.StatusBadRequest)
			return
		}

		if err := nodeRepo.UpsertNode(r.Context(), &n); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}))

	mux.HandleFunc("/nodes/register", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		var body struct {
			Token        string `json:"token"`
			Domain       string `json:"domain"`
			Region       string `json:"region"`
			PublicURL    string `json:"publicUrl"`
			AgentVersion string `json:"agentVersion"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}

		if body.Token == "" || body.Domain == "" {
			http.Error(w, "token and domain are required", http.StatusBadRequest)
			return
		}

		// cek token
		nt, err := nodeTokenRepo.Get(r.Context(), body.Token)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if nt == nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		// bentuk nodeId sederhana dari domain (bisa diubah nanti)
		nodeID := "node-" + body.Domain

		node := &models.Node{
			ID:           nodeID,
			Name:         nt.Label,
			Region:       body.Region,
			PublicURL:    body.PublicURL,
			LastSeenAt:   time.Now().UTC(),
			IsOnline:     true,
			AgentVersion: body.AgentVersion,
		}

		if err := nodeRepo.UpsertNode(r.Context(), node); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// tandai token sudah dipakai (opsional, masih boleh dipakai ulang kalau mau)
		if err := nodeTokenRepo.MarkUsed(r.Context(), body.Token); err != nil {
			log.Printf("warning: failed to mark token used: %v", err)
		}

		resp := struct {
			NodeID    string `json:"nodeId"`
			Name      string `json:"name"`
			Region    string `json:"region"`
			PublicURL string `json:"publicUrl"`
		}{
			NodeID:    node.ID,
			Name:      node.Name,
			Region:    node.Region,
			PublicURL: node.PublicURL,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))

	// Admin endpoints
	mux.HandleFunc("/admin/nodes", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		nodes, err := nodeRepo.List(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(nodes)
	}))

	// Node domain management endpoints
	mux.HandleFunc("/admin/nodes/", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		// Parse nodeID from path: /admin/nodes/:id/domains
		path := strings.TrimPrefix(r.URL.Path, "/admin/nodes/")
		parts := strings.Split(path, "/")

		if len(parts) < 2 || parts[1] != "domains" {
			http.Error(w, "invalid path", http.StatusBadRequest)
			return
		}

		nodeID := parts[0]

		switch r.Method {
		case http.MethodPost:
			// Add domain
			var input struct {
				Domain string `json:"domain"`
			}
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}

			if strings.TrimSpace(input.Domain) == "" {
				http.Error(w, "domain is required", http.StatusBadRequest)
				return
			}

			if err := nodeRepo.AddDomain(r.Context(), nodeID, strings.TrimSpace(input.Domain)); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusNoContent)

		case http.MethodDelete:
			// Remove domain
			domain := r.URL.Query().Get("domain")
			if domain == "" {
				http.Error(w, "domain query parameter is required", http.StatusBadRequest)
				return
			}

			if err := nodeRepo.RemoveDomain(r.Context(), nodeID, domain); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusNoContent)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/admin/link-stats", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		stats, err := statsRepo.ListAll(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}))

	mux.HandleFunc("/admin/settings", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			settings, err := settingsRepo.Get(r.Context())
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Jika belum ada settings, return default
			if settings == nil {
				settings = models.DefaultSettings()
			}

			// Mask API keys untuk keamanan (hanya tampilkan 4 char terakhir)
			maskAPIKey := func(key string) string {
				if len(key) <= 4 {
					return "****"
				}
				return "****" + key[len(key)-4:]
			}

			// Clone settings untuk response dengan masked keys
			response := *settings
			if response.ProxyCheckAPIKey != "" {
				response.ProxyCheckAPIKey = maskAPIKey(response.ProxyCheckAPIKey)
			}
			if response.IPQualityScoreAPIKey != "" {
				response.IPQualityScoreAPIKey = maskAPIKey(response.IPQualityScoreAPIKey)
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)

		case http.MethodPut:
			var input models.Settings
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}

			// Ambil settings existing untuk preserve CreatedAt
			existing, _ := settingsRepo.Get(r.Context())
			if existing != nil {
				input.CreatedAt = existing.CreatedAt

				// Jika API key dikirim dengan mask (****xxxx), gunakan nilai lama
				if strings.HasPrefix(input.ProxyCheckAPIKey, "****") {
					input.ProxyCheckAPIKey = existing.ProxyCheckAPIKey
				}
				if strings.HasPrefix(input.IPQualityScoreAPIKey, "****") {
					input.IPQualityScoreAPIKey = existing.IPQualityScoreAPIKey
				}
			}

			if err := settingsRepo.Update(r.Context(), &input); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(input)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/admin/node-tokens", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			tokens, err := nodeTokenRepo.List(r.Context())
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(tokens)

		case http.MethodPost:
			var body struct {
				Label string `json:"label"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if body.Label == "" {
				body.Label = "Unnamed node"
			}

			token, err := util.RandomToken(24) // 48 char hex
			if err != nil {
				http.Error(w, "failed to generate token", http.StatusInternalServerError)
				return
			}

			nt, err := nodeTokenRepo.Create(r.Context(), body.Label, token)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(nt)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	// Link Groups endpoints
	mux.HandleFunc("/admin/groups", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			groups, err := groupRepo.List(r.Context())
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(groups)

		case http.MethodPost:
			var input models.LinkGroup
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}

			if strings.TrimSpace(input.Name) == "" {
				http.Error(w, "name is required", http.StatusBadRequest)
				return
			}

			if err := groupRepo.Create(r.Context(), &input); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(input)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/admin/groups/", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		// Extract group ID from path: /admin/groups/{id}
		path := strings.TrimPrefix(r.URL.Path, "/admin/groups/")
		groupID := strings.TrimSpace(path)

		if groupID == "" {
			http.Error(w, "group id is required", http.StatusBadRequest)
			return
		}

		switch r.Method {
		case http.MethodGet:
			group, err := groupRepo.Get(r.Context(), groupID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if group == nil {
				http.Error(w, "group not found", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(group)

		case http.MethodPut:
			var input models.LinkGroup
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}

			input.ID = groupID
			if err := groupRepo.Update(r.Context(), &input); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(input)

		case http.MethodDelete:
			if err := groupRepo.Delete(r.Context(), groupID); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusNoContent)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	// Webhook endpoints
	mux.HandleFunc("/admin/webhooks", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			webhooks, err := webhookRepo.GetAll(r.Context())
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(webhooks)

		case http.MethodPost:
			var webhook models.Webhook
			if err := json.NewDecoder(r.Body).Decode(&webhook); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}

			// Validation
			if strings.TrimSpace(webhook.URL) == "" {
				http.Error(w, "url is required", http.StatusBadRequest)
				return
			}
			if len(webhook.Events) == 0 {
				http.Error(w, "at least one event is required", http.StatusBadRequest)
				return
			}
			if strings.TrimSpace(webhook.Secret) == "" {
				http.Error(w, "secret is required", http.StatusBadRequest)
				return
			}

			// Set defaults
			webhook.ID = uuid.NewString()
			webhook.CreatedAt = time.Now()
			webhook.UpdatedAt = time.Now()
			if !webhook.IsActive {
				webhook.IsActive = true // Default to active
			}

			if err := webhookRepo.Create(r.Context(), &webhook); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(webhook)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/admin/webhooks/", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		// Extract webhook ID from path: /admin/webhooks/{id} or /admin/webhooks/{id}/test
		path := strings.TrimPrefix(r.URL.Path, "/admin/webhooks/")
		parts := strings.Split(path, "/")
		webhookID := strings.TrimSpace(parts[0])

		if webhookID == "" {
			http.Error(w, "webhook id is required", http.StatusBadRequest)
			return
		}

		// Check if this is a test request
		if len(parts) > 1 && parts[1] == "test" && r.Method == http.MethodPost {
			// Test webhook delivery
			webhook, err := webhookRepo.GetByID(r.Context(), webhookID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Create test payload
			testPayload := &models.WebhookPayload{
				Event:     "test.webhook",
				Timestamp: time.Now(),
				Data: map[string]interface{}{
					"message": "This is a test webhook from NexusLink",
					"test":    true,
				},
			}

			// Send webhook in background
			go func() {
				ctx := context.Background()
				result, err := webhookSender.SendWebhook(ctx, webhook, testPayload)
				if err != nil {
					log.Printf("Test webhook failed: %v", err)
				} else if result.Success {
					log.Printf("Test webhook sent successfully to %s (status: %d)", webhook.URL, result.StatusCode)
				} else {
					log.Printf("Test webhook failed with status %d: %s", result.StatusCode, result.ResponseBody)
				}
			}()

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "sent",
				"message": "Test webhook delivery initiated",
			})
			return
		}

		switch r.Method {
		case http.MethodGet:
			webhook, err := webhookRepo.GetByID(r.Context(), webhookID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(webhook)

		case http.MethodPut:
			var webhook models.Webhook
			if err := json.NewDecoder(r.Body).Decode(&webhook); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}

			webhook.ID = webhookID
			webhook.UpdatedAt = time.Now()
			if err := webhookRepo.Update(r.Context(), &webhook); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(webhook)

		case http.MethodDelete:
			if err := webhookRepo.Delete(r.Context(), webhookID); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusNoContent)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	// Settings endpoints - Rate Limit Configuration
	mux.HandleFunc("/admin/settings/rate-limit", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			// Return rate limit config
			config := settingsRepo.GetRateLimitConfig()
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(config)

		case http.MethodPut:
			var input map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				http.Error(w, "invalid JSON", http.StatusBadRequest)
				return
			}

			// Extract values
			ipLimit := 0
			linkLimit := 0
			window := 0

			if val, ok := input["ip_limit"].(float64); ok {
				ipLimit = int(val)
			}
			if val, ok := input["link_limit"].(float64); ok {
				linkLimit = int(val)
			}
			if val, ok := input["window_seconds"].(float64); ok {
				window = int(val)
			}

			// Update settings
			if err := settingsRepo.UpdateRateLimitConfig(ipLimit, linkLimit, window); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Return updated config
			config := settingsRepo.GetRateLimitConfig()
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(config)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	// Rate Limit Analytics endpoints
	mux.HandleFunc("/admin/rate-limits", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			// Get all active rate limits
			if rateLimiter == nil {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode([]ratelimit.RateLimitInfo{})
				return
			}

			limits, err := rateLimiter.GetAllRateLimits(r.Context())
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(limits)

		case http.MethodDelete:
			// Reset rate limit for specific key
			if rateLimiter == nil {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			var input struct {
				Key string `json:"key"`
			}
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				http.Error(w, "invalid JSON", http.StatusBadRequest)
				return
			}

			if input.Key == "" {
				http.Error(w, "key is required", http.StatusBadRequest)
				return
			}

			if err := rateLimiter.Reset(r.Context(), input.Key); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusNoContent)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	addr := config.GetEnv("NEXUS_HTTP_ADDR", ":8080")
	log.Printf("Nexus API listening on %s\n", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// triggerWebhooks triggers all active webhooks subscribed to an event
func triggerWebhooks(ctx context.Context, webhookRepo *repository.WebhookRepository, webhookSender *webhook.Sender, event string, data map[string]interface{}) {
	webhooks, err := webhookRepo.GetByEvent(ctx, event)
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
			result, err := webhookSender.SendWebhook(ctx, &w, payload)
			if err != nil {
				log.Printf("Webhook error: event=%s url=%s error=%v", event, w.URL, err)
			} else if !result.Success {
				log.Printf("Webhook failed: event=%s url=%s status=%d", event, w.URL, result.StatusCode)
			}
		}(wh)
	}
}
