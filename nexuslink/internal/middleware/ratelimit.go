package middleware

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/afuzapratama/nexuslink/internal/ratelimit"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	// Requests per IP per minute
	IPLimit int
	// Requests per link per minute
	LinkLimit int
	// Window duration
	Window time.Duration
}

// DefaultRateLimitConfig returns sensible defaults
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		IPLimit:   60,  // 60 requests per minute per IP
		LinkLimit: 120, // 120 requests per minute per link
		Window:    1 * time.Minute,
	}
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(limiter *ratelimit.Limiter, config RateLimitConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.Background()

			// Extract IP from X-Real-IP or X-Forwarded-For or RemoteAddr
			ip := r.Header.Get("X-Real-IP")
			if ip == "" {
				ip = r.Header.Get("X-Forwarded-For")
			}
			if ip == "" {
				// Strip port from RemoteAddr
				host, _, err := net.SplitHostPort(r.RemoteAddr)
				if err != nil {
					ip = r.RemoteAddr // fallback if parsing fails
				} else {
					ip = host
				}
			}

			// Check IP rate limit
			ipKey := fmt.Sprintf("ip:%s", ip)
			allowed, remaining, resetAt, err := limiter.Allow(ctx, ipKey, config.IPLimit, config.Window)

			// Set rate limit headers
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", config.IPLimit))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetAt.Unix()))

			if err != nil {
				// Log error but don't block request
				http.Error(w, "Rate limit check failed", http.StatusInternalServerError)
				return
			}

			if !allowed {
				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(config.Window.Seconds())))
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
