package config

import (
	"log"
	"os"
	"sync"

	"github.com/joho/godotenv"
)

var once sync.Once

// Init akan dipanggil sekali di awal (di main API & Agent)
func Init() {
	once.Do(func() {
		// Load .env kalau ada. Kalau nggak ada, ya sudah, pakai env OS saja.
		if err := godotenv.Load(".env"); err != nil {
			log.Println("config: .env not found, using OS env only")
		} else {
			log.Println("config: .env loaded")
		}
	})
}

// Helper: ambil env dengan default
func GetEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}
