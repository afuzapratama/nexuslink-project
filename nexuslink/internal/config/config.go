package config

import (
	"log"
	"os"
	"sync"

	"github.com/joho/godotenv"
)

var once sync.Once

// Init akan dipanggil sekali di awal (di main API & Agent)
// Priority: .env.production > .env > OS environment
func Init() {
	once.Do(func() {
		// Try loading in priority order:
		// 1. .env.production (production deployment)
		// 2. .env (local development)
		// 3. OS environment only (fallback)
		
		if err := godotenv.Load(".env.production"); err == nil {
			log.Println("✅ config: loaded .env.production")
			return
		}
		
		if err := godotenv.Load(".env"); err == nil {
			log.Println("✅ config: loaded .env (development)")
			return
		}
		
		log.Println("⚠️  config: no .env file found, using OS environment only")
	})
}

// Helper: ambil env dengan default
func GetEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}
