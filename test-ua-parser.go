package main

import (
	"fmt"
	"github.com/mssola/user_agent"
)

func main() {
	// Test berbagai User-Agent
	testCases := []string{
		// Chrome Windows
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		// Chrome Mac
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		// Chrome Linux
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		// Firefox
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
		// Safari
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
		// curl
		"curl/8.5.0",
	}

	for i, uaString := range testCases {
		fmt.Printf("\n=== Test #%d ===\n", i+1)
		fmt.Printf("UA: %s\n", uaString)
		
		u := user_agent.New(uaString)
		
		browser, _ := u.Browser()
		os := u.OS()
		mobile := u.Mobile()
		bot := u.Bot()
		
		device := "Desktop"
		if mobile {
			device = "Mobile"
		}
		
		fmt.Printf("  Browser: '%s'\n", browser)
		fmt.Printf("  OS: '%s'\n", os)
		fmt.Printf("  Device: '%s'\n", device)
		fmt.Printf("  Bot: %v\n", bot)
	}
}
