package handler

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/afuzapratama/nexuslink/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	settingsRepo *repository.SettingsRepository
	sessions     map[string]*Session // sessionToken -> Session
	mu           sync.RWMutex
}

type Session struct {
	Username  string
	CreatedAt time.Time
	ExpiresAt time.Time
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success      bool   `json:"success"`
	SessionToken string `json:"sessionToken,omitempty"`
	Message      string `json:"message,omitempty"`
}

type SessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	Username      string `json:"username,omitempty"`
}

func NewAuthHandler(settingsRepo *repository.SettingsRepository) *AuthHandler {
	h := &AuthHandler{
		settingsRepo: settingsRepo,
		sessions:     make(map[string]*Session),
	}

	// Cleanup expired sessions setiap 1 jam
	go h.cleanupExpiredSessions()

	return h
}

// HandleLogin handles POST /auth/login
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	// Get settings from DB
	ctx := context.Background()
	settings := h.settingsRepo.GetOrDefault(ctx)

	// Verify username
	if req.Username != settings.AdminUsername {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Invalid username or password",
		})
		return
	}

	// Verify password (bcrypt compare)
	if err := bcrypt.CompareHashAndPassword([]byte(settings.AdminPassword), []byte(req.Password)); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Invalid username or password",
		})
		return
	}

	// Generate session token
	token := h.generateSessionToken()
	session := &Session{
		Username:  req.Username,
		CreatedAt: time.Now().UTC(),
		ExpiresAt: time.Now().UTC().Add(24 * time.Hour), // 24 jam
	}

	h.mu.Lock()
	h.sessions[token] = session
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{
		Success:      true,
		SessionToken: token,
		Message:      "Login successful",
	})
}

// HandleLogout handles POST /auth/logout
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get token dari header Authorization
	token := r.Header.Get("Authorization")
	if token == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Logged out",
		})
		return
	}

	// Remove "Bearer " prefix jika ada
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	// Delete session
	h.mu.Lock()
	delete(h.sessions, token)
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Logged out successfully",
	})
}

// HandleSession handles GET /auth/session (check if logged in)
func (h *AuthHandler) HandleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	if token == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SessionResponse{
			Authenticated: false,
		})
		return
	}

	// Remove "Bearer " prefix
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	session := h.getSession(token)
	if session == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SessionResponse{
			Authenticated: false,
		})
		return
	}

	// Check if expired
	if time.Now().UTC().After(session.ExpiresAt) {
		h.mu.Lock()
		delete(h.sessions, token)
		h.mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SessionResponse{
			Authenticated: false,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SessionResponse{
		Authenticated: true,
		Username:      session.Username,
	})
}

// WithAuth middleware untuk protect endpoint
func (h *AuthHandler) WithAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Remove "Bearer " prefix
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		session := h.getSession(token)
		if session == nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Check if expired
		if time.Now().UTC().After(session.ExpiresAt) {
			h.mu.Lock()
			delete(h.sessions, token)
			h.mu.Unlock()

			http.Error(w, "Session expired", http.StatusUnauthorized)
			return
		}

		// Extend session expiry (activity-based)
		h.mu.Lock()
		session.ExpiresAt = time.Now().UTC().Add(24 * time.Hour)
		h.mu.Unlock()

		next(w, r)
	}
}

func (h *AuthHandler) getSession(token string) *Session {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.sessions[token]
}

func (h *AuthHandler) generateSessionToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func (h *AuthHandler) cleanupExpiredSessions() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now().UTC()
		h.mu.Lock()
		for token, session := range h.sessions {
			if now.After(session.ExpiresAt) {
				delete(h.sessions, token)
			}
		}
		h.mu.Unlock()
	}
}
