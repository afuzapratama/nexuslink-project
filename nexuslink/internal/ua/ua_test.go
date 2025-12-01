package ua

import (
	"fmt"
	"testing"
)

func TestParse(t *testing.T) {
	testCases := []struct {
		name          string
		ua            string
		expectOS      string
		expectDevice  string
		expectBrowser string
		expectBot     bool
	}{
		{
			name:          "Chrome Windows",
			ua:            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			expectOS:      "Windows 10",
			expectDevice:  "Desktop",
			expectBrowser: "Chrome",
			expectBot:     false,
		},
		{
			name:          "Chrome Linux",
			ua:            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			expectOS:      "Linux x86_64",
			expectDevice:  "Desktop",
			expectBrowser: "Chrome",
			expectBot:     false,
		},
		{
			name:          "Firefox",
			ua:            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
			expectOS:      "Windows 10",
			expectDevice:  "Desktop",
			expectBrowser: "Firefox",
			expectBot:     false,
		},
		{
			name:          "curl (bot)",
			ua:            "curl/8.5.0",
			expectBrowser: "curl",
			expectBot:     true, // curl should be detected as bot
		},
		{
			name:      "Googlebot",
			ua:        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
			expectBot: true,
		},
		{
			name:      "Python requests",
			ua:        "python-requests/2.28.0",
			expectBot: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			os, device, browser, isBot, botType := Parse(tc.ua)

			if tc.expectOS != "" && os != tc.expectOS {
				t.Errorf("OS mismatch: got '%s', want '%s'", os, tc.expectOS)
			}

			if tc.expectDevice != "" && device != tc.expectDevice {
				t.Errorf("Device mismatch: got '%s', want '%s'", device, tc.expectDevice)
			}

			if tc.expectBrowser != "" && browser != tc.expectBrowser {
				t.Errorf("Browser mismatch: got '%s', want '%s'", browser, tc.expectBrowser)
			}

			if isBot != tc.expectBot {
				t.Errorf("Bot detection mismatch: got %v, want %v (botType: %s)", isBot, tc.expectBot, botType)
			}

			// Print for manual verification
			fmt.Printf("  %s: OS='%s', Device='%s', Browser='%s', Bot=%v, BotType='%s'\n",
				tc.name, os, device, browser, isBot, botType)
		})
	}
}

func TestIsKnownBot(t *testing.T) {
	botTests := []struct {
		ua        string
		expectBot bool
	}{
		{"curl/8.5.0", true},
		{"python-requests/2.28.0", true},
		{"Googlebot", true},
		{"GPTBot", true},
		{"wget/1.21", true},
		{"Scrapy/2.5", true},
		{"Mozilla/5.0 (Windows NT 10.0) Chrome/131.0", false}, // Normal browser
	}

	for _, tc := range botTests {
		isBot, botType := IsKnownBot(tc.ua)
		if isBot != tc.expectBot {
			t.Errorf("IsKnownBot(%s): got %v, want %v (type: %s)", tc.ua, isBot, tc.expectBot, botType)
		} else {
			fmt.Printf("  ✓ %s -> Bot=%v, Type='%s'\n", tc.ua, isBot, botType)
		}
	}
}
