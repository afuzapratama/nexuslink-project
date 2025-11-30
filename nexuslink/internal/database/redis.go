package database

import (
	"context"
	"log"
	"sync"

	"github.com/afuzapratama/nexuslink/internal/config"
	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	redisOnce   sync.Once
)

// GetRedisClient mengembalikan singleton Redis client
func GetRedisClient() *redis.Client {
	redisOnce.Do(func() {
		addr := config.GetEnv("NEXUS_REDIS_ADDR", "127.0.0.1:6379")
		password := config.GetEnv("NEXUS_REDIS_PASSWORD", "")
		db := 0 // default DB

		redisClient = redis.NewClient(&redis.Options{
			Addr:     addr,
			Password: password,
			DB:       db,
		})

		// Test connection
		ctx := context.Background()
		if err := redisClient.Ping(ctx).Err(); err != nil {
			log.Printf("Redis connection failed: %v (continuing without Redis)", err)
			// Tidak fatal, biarkan app jalan tanpa Redis
		} else {
			log.Printf("Redis connected: %s", addr)
		}
	})

	return redisClient
}
