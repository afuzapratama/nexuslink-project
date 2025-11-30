package geoip

import (
	"log"
	"net"
	"os"
	"sync"

	"github.com/oschwald/geoip2-golang"
)

var (
	db      *geoip2.Reader
	once    sync.Once
	loadErr error
)

func initDB() {
	path := os.Getenv("NEXUS_MAXMIND_DB_PATH")
	if path == "" {
		return
	}

	var err error
	db, err = geoip2.Open(path)
	if err != nil {
		loadErr = err
		log.Printf("geoip: failed to open MaxMind DB: %v", err)
	}
}

// Lookup mengembalikan countryCode + city (boleh kosong kalau gagal)
func Lookup(ipStr string) (countryCode, city string) {
	once.Do(initDB)

	if db == nil {
		return "", ""
	}

	ip := net.ParseIP(ipStr)
	if ip == nil {
		return "", ""
	}

	record, err := db.City(ip)
	if err != nil {
		return "", ""
	}

	if record.Country.IsoCode != "" {
		countryCode = record.Country.IsoCode
	}
	if name, ok := record.City.Names["en"]; ok {
		city = name
	}
	return
}
