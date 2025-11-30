package ratelimit

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// Limiter implements sliding window rate limiting using Redis
type Limiter struct {
	client *redis.Client
}

// NewLimiter creates a new rate limiter
func NewLimiter(client *redis.Client) *Limiter {
	return &Limiter{client: client}
}

// Allow checks if a request is allowed based on rate limit
// key: unique identifier (e.g., "ip:192.168.1.1" or "link:alias")
// limit: max requests allowed
// window: time window duration
// Returns: allowed (bool), remaining (int), resetAt (time.Time)
func (l *Limiter) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, int, time.Time, error) {
	if l.client == nil {
		// Redis not available, allow all requests
		return true, limit, time.Now().Add(window), nil
	}

	now := time.Now()
	windowStart := now.Add(-window)

	// Redis key for this rate limit
	redisKey := fmt.Sprintf("ratelimit:%s", key)

	pipe := l.client.Pipeline()

	// Remove old entries outside the window
	pipe.ZRemRangeByScore(ctx, redisKey, "0", fmt.Sprintf("%d", windowStart.UnixNano()))

	// Add current request with score = current timestamp
	pipe.ZAdd(ctx, redisKey, redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})

	// Count entries AFTER adding current request
	countCmd := pipe.ZCard(ctx, redisKey)

	// Set expiration to window duration
	pipe.Expire(ctx, redisKey, window)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, now.Add(window), fmt.Errorf("redis error: %w", err)
	}

	count := int(countCmd.Val())
	allowed := count <= limit
	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}

	resetAt := now.Add(window)

	return allowed, remaining, resetAt, nil
}

// Reset clears rate limit for a specific key
func (l *Limiter) Reset(ctx context.Context, key string) error {
	if l.client == nil {
		return nil
	}

	redisKey := fmt.Sprintf("ratelimit:%s", key)
	return l.client.Del(ctx, redisKey).Err()
}

// GetCount returns current request count for a key
func (l *Limiter) GetCount(ctx context.Context, key string) (int, error) {
	if l.client == nil {
		return 0, nil
	}

	redisKey := fmt.Sprintf("ratelimit:%s", key)
	count, err := l.client.ZCard(ctx, redisKey).Result()
	return int(count), err
}

// RateLimitInfo holds information about a rate-limited key
type RateLimitInfo struct {
	Key       string    `json:"key"`       // Original key (e.g., "ip:1.2.3.4")
	Count     int       `json:"count"`     // Current request count
	ExpiresAt time.Time `json:"expiresAt"` // When the rate limit resets
}

// GetAllRateLimits returns all active rate limits
func (l *Limiter) GetAllRateLimits(ctx context.Context) ([]RateLimitInfo, error) {
	if l.client == nil {
		return []RateLimitInfo{}, nil
	}

	// Scan for all ratelimit:* keys
	var cursor uint64
	var keys []string

	for {
		var batch []string
		var err error
		batch, cursor, err = l.client.Scan(ctx, cursor, "ratelimit:*", 100).Result()
		if err != nil {
			return nil, err
		}

		keys = append(keys, batch...)

		if cursor == 0 {
			break
		}
	}

	// Get info for each key
	var results []RateLimitInfo

	for _, redisKey := range keys {
		// Get count
		count, err := l.client.ZCard(ctx, redisKey).Result()
		if err != nil {
			continue
		}

		// Get TTL
		ttl, err := l.client.TTL(ctx, redisKey).Result()
		if err != nil {
			continue
		}

		// Extract original key (remove "ratelimit:" prefix)
		originalKey := strings.TrimPrefix(redisKey, "ratelimit:")

		results = append(results, RateLimitInfo{
			Key:       originalKey,
			Count:     int(count),
			ExpiresAt: time.Now().Add(ttl),
		})
	}

	return results, nil
}
