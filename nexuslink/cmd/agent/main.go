package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/afuzapratama/nexuslink/internal/config"
	"github.com/afuzapratama/nexuslink/internal/database"
	"github.com/afuzapratama/nexuslink/internal/middleware"
	"github.com/afuzapratama/nexuslink/internal/ratelimit"
)

type Link struct {
	TargetURL string `json:"targetUrl"`
}

type Node struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Region       string `json:"region"`
	PublicURL    string `json:"publicUrl"`
	AgentVersion string `json:"agentVersion"`
}

var currentNodeID string

func main() {
	// load .env
	config.Init()

	apiBase := config.GetEnv("NEXUS_API_BASE", "http://localhost:8080")
	addr := config.GetEnv("NEXUS_AGENT_PORT", ":9090")
	apiKey := config.GetEnv("NEXUS_AGENT_API_KEY", "")

	nodeName := config.GetEnv("NEXUS_NODE_NAME", "Local Dev Node")
	nodeRegion := config.GetEnv("NEXUS_NODE_REGION", "ID-JKT")
	nodePublicURL := config.GetEnv("NEXUS_NODE_PUBLIC_URL", "http://localhost:9090")

	// Mode lama: baca node ID langsung dari env (fallback)
	currentNodeID = config.GetEnv("NEXUS_NODE_ID", "")

	// Mode baru: token + domain
	token := config.GetEnv("NEXUS_NODE_TOKEN", "")
	domain := config.GetEnv("NEXUS_NODE_DOMAIN", "")

	if token != "" && domain != "" {
		if err := registerNodeWithToken(apiBase, apiKey, token, domain, nodeRegion, nodePublicURL, nodeName); err != nil {
			log.Printf("node register via token failed: %v", err)
		}
	}

	// Kalau setelah semua ini nodeID masih kosong, bikin fallback
	if currentNodeID == "" {
		if domain != "" {
			currentNodeID = "node-" + domain
		} else {
			currentNodeID = "node-local"
		}
	}

	// Start heartbeat loop
	startHeartbeat(apiBase, apiKey, nodeName, nodeRegion, nodePublicURL)

	// Initialize Redis client
	redisClient := database.GetRedisClient()
	limiter := ratelimit.NewLimiter(redisClient)
	rateLimitConfig := middleware.DefaultRateLimitConfig()

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK - Nexus Agent is running"))
	})

	// Redirect handler with rate limiting: /r/{alias}
	redirectHandlerFunc := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		redirectHandler(w, r, apiBase, apiKey)
	})
	rateLimitedHandler := middleware.RateLimitMiddleware(limiter, rateLimitConfig)(redirectHandlerFunc)
	mux.Handle("/r/", rateLimitedHandler)

	log.Printf("Nexus Agent listening on %s (API: %s, nodeID=%s, rate limit: %d/min per IP)\n",
		addr, apiBase, currentNodeID, rateLimitConfig.IPLimit)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("agent server error: %v", err)
	}
}

// registerNodeWithToken → panggil /nodes/register di API pakai token
func registerNodeWithToken(apiBase, apiKey, token, domain, region, publicURL, name string) error {
	body := map[string]string{
		"token":        token,
		"domain":       domain,
		"region":       region,
		"publicUrl":    publicURL,
		"agentVersion": "0.1.0-dev",
	}

	b, _ := json.Marshal(body)
	urlStr := fmt.Sprintf("%s/nodes/register", apiBase)

	req, err := http.NewRequest(http.MethodPost, urlStr, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("X-Nexus-Api-Key", apiKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("register failed: status=%d body=%s", resp.StatusCode, string(data))
	}

	var out struct {
		NodeID    string `json:"nodeId"`
		Name      string `json:"name"`
		Region    string `json:"region"`
		PublicURL string `json:"publicUrl"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return err
	}

	if out.NodeID != "" {
		currentNodeID = out.NodeID
		log.Printf("Registered as nodeID=%s domain=%s", out.NodeID, domain)
	}

	return nil
}

// startHeartbeat → kirim status node berkala ke /nodes/heartbeat
func startHeartbeat(apiBase, apiKey, nodeName, nodeRegion, nodePublicURL string) {
	node := Node{
		ID:           currentNodeID,
		Name:         nodeName,
		Region:       nodeRegion,
		PublicURL:    nodePublicURL,
		AgentVersion: "0.1.0-dev",
	}

	urlStr := fmt.Sprintf("%s/nodes/heartbeat", apiBase)

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			body, _ := json.Marshal(node)

			req, err := http.NewRequest(http.MethodPost, urlStr, bytes.NewReader(body))
			if err != nil {
				log.Printf("heartbeat: error creating request: %v", err)
			} else {
				req.Header.Set("Content-Type", "application/json")
				if apiKey != "" {
					req.Header.Set("X-Nexus-Api-Key", apiKey)
				}

				resp, err := http.DefaultClient.Do(req)
				if err != nil {
					log.Printf("heartbeat: error sending: %v", err)
				} else {
					resp.Body.Close()
					if resp.StatusCode != http.StatusNoContent {
						log.Printf("heartbeat: unexpected status %d", resp.StatusCode)
					}
				}
			}

			<-ticker.C
		}
	}()
}

// redirectHandler → handle /r/{alias}
func redirectHandler(w http.ResponseWriter, r *http.Request, apiBase, apiKey string) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Path
	alias := strings.TrimPrefix(path, "/r/")
	alias = strings.TrimSpace(alias)

	if alias == "" {
		http.Error(w, "alias is required", http.StatusBadRequest)
		return
	}

	// Get current domain from request Host header
	currentDomain := r.Host
	// Remove port if exists
	if idx := strings.Index(currentDomain, ":"); idx != -1 {
		currentDomain = currentDomain[:idx]
	}

	// ambil info visitor (IP, UA, referer)
	visitorIP := r.RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		visitorIP = host
	}

	// DEV-ONLY: override IP pakai env kalau diset
	// Contoh: NEXUS_DEBUG_IP=8.8.8.8
	if debugIP := config.GetEnv("NEXUS_DEBUG_IP", ""); debugIP != "" {
		visitorIP = debugIP
	}

	visitorUA := r.Header.Get("User-Agent")
	visitorRef := r.Referer()

	// Include domain in API request for domain-specific link resolution
	apiURL := fmt.Sprintf("%s/links/resolve?alias=%s&nodeId=%s&domain=%s",
		apiBase,
		url.QueryEscape(alias),
		url.QueryEscape(currentNodeID),
		url.QueryEscape(currentDomain),
	)

	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		log.Printf("error creating API request: %v", err)
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}
	if apiKey != "" {
		req.Header.Set("X-Nexus-Api-Key", apiKey)
	}

	// forward info visitor ke API
	if visitorIP != "" {
		req.Header.Set("X-Real-IP", visitorIP)
	}
	if visitorUA != "" {
		req.Header.Set("X-Visitor-User-Agent", visitorUA)
	}
	if visitorRef != "" {
		req.Header.Set("X-Visitor-Referer", visitorRef)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("error calling API: %v", err)
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		http.NotFound(w, r)
		return
	}

	if resp.StatusCode == http.StatusForbidden {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Access forbidden: %s", string(body))
		http.Error(w, "access forbidden", http.StatusForbidden)
		return
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("API returned status %d body=%s", resp.StatusCode, string(body))
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}

	var link Link
	if err := json.NewDecoder(resp.Body).Decode(&link); err != nil {
		log.Printf("error decoding API response: %v", err)
		http.Error(w, "invalid upstream response", http.StatusBadGateway)
		return
	}

	if link.TargetURL == "" {
		http.Error(w, "no target url", http.StatusBadGateway)
		return
	}

	http.Redirect(w, r, link.TargetURL, http.StatusFound)
}
