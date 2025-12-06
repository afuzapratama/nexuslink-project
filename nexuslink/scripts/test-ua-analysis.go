package main

import (
	"fmt"
	"strings"

	"github.com/afuzapratama/nexuslink/internal/ua"
)

func main() {
	testCases := []struct {
		Name string
		UA   string
	}{
		{"Windows Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
		{"Windows Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"},
		{"Windows Edge", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"},
		{"macOS Safari", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"},
		{"macOS Chrome", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
		{"Linux Chrome", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
		{"iPhone Safari", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1"},
		{"iPhone Chrome", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1"},
		{"iPad Safari", "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1"},
		{"Android Chrome", "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36"},
		{"Android Firefox", "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0"},
		{"Android Samsung", "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36"},
		{"Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},
	}

	fmt.Println("\n╔═════════════════════════════════════════════════════════════════════════╗")
	fmt.Println("║            UA Parser Analysis - OS/Browser/Device Detection            ║")
	fmt.Println("╚═════════════════════════════════════════════════════════════════════════╝\n")

	for _, tc := range testCases {
		osName, deviceType, browserName, isBot, botType := ua.Parse(tc.UA)
		
		fmt.Printf("📱 %s\n", tc.Name)
		fmt.Println(strings.Repeat("-", 75))
		fmt.Printf("   OS: %s\n", osName)
		fmt.Printf("   Browser: %s\n", browserName)
		fmt.Printf("   Device: %s\n", deviceType)
		if isBot {
			fmt.Printf("   🤖 Bot: %s\n", botType)
		}
		fmt.Println()
	}

	fmt.Println("📋 Normalized Matching Test:")
	fmt.Println(strings.Repeat("=", 75))
	
	// Test macOS matching
	testOS := "Intel Mac OS X 10_15_7"
	filters := []string{"macOS", "iOS", "Windows"}
	
	fmt.Printf("\nDetected OS: \"%s\"\n", testOS)
	fmt.Println("Testing against filters:")
	
	for _, filter := range filters {
		osNormalized := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(testOS, " ", ""), "_", ""))
		filterNormalized := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(filter, " ", ""), "_", ""))
		match := strings.Contains(osNormalized, filterNormalized)
		
		status := "❌"
		if match {
			status = "✅"
		}
		fmt.Printf("  %s \"%s\" → Normalized: \"%s\" → Match: %v\n", status, filter, filterNormalized, match)
	}
	
	fmt.Println("\n" + strings.Repeat("=", 75))
	fmt.Println("\n✅ Analysis Complete!")
	fmt.Println("Use these exact strings in dashboard filters for matching.")
	fmt.Println()
}
