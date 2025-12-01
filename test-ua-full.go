package main

import (
	"fmt"
	"github.com/afuzapratama/nexuslink/internal/ua"
)

func main() {
	// Test berbagai User-Agent dengan ua.Parse()
	testCases := []struct {
		name string
		ua   string
	}{
		{"Chrome Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"},
		{"Chrome Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"},
		{"Chrome Linux", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"},
		{"Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"},
		{"Safari", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"},
		{"curl", "curl/8.5.0"},
		{"Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},
		{"ChatGPT", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)"},
		{"Python", "python-requests/2.28.0"},
		{"Wget", "Wget/1.21.3"},
	}

	fmt.Println("=== Testing ua.Parse() ===\n")

	for _, tc := range testCases {
		fmt.Printf("Test: %s\n", tc.name)
		fmt.Printf("UA: %s\n", tc.ua)
		
		os, device, browser, isBot, botType := ua.Parse(tc.ua)
		
		fmt.Printf("  OS: '%s'\n", os)
		fmt.Printf("  Device: '%s'\n", device)
		fmt.Printf("  Browser: '%s'\n", browser)
		fmt.Printf("  IsBot: %v\n", isBot)
		if isBot {
			fmt.Printf("  BotType: '%s'\n", botType)
		}
		fmt.Println()
	}

	// Test IsKnownBot specifically
	fmt.Println("=== Testing Bot Detection ===\n")
	
	botTests := []string{
		"curl/8.5.0",
		"python-requests/2.28.0",
		"Googlebot",
		"GPTBot",
		"normal browser UA",
	}

	for _, uaStr := range botTests {
		isBot, botType := ua.IsKnownBot(uaStr)
		fmt.Printf("UA: %s\n", uaStr)
		fmt.Printf("  IsKnownBot: %v, Type: %s\n\n", isBot, botType)
	}
}
