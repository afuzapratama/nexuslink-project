package handler

import (
	"net/http"
	"os"
)

// WithAgentAuth wraps handler with API key authentication
func WithAgentAuth(next http.HandlerFunc) http.HandlerFunc {
	expectedKey := os.Getenv("NEXUS_API_KEY")
	if expectedKey == "" {
		expectedKey = "your-secret-api-key-here"
	}

	return func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-Nexus-Api-Key")
		if apiKey != expectedKey {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}
