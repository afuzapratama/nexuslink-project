package ua

import (
	"regexp"
	"strings"

	"github.com/mssola/user_agent"
)

// BotPatterns adalah list regex patterns untuk detect known bots
var BotPatterns = []string{
	// Search Engine Bots
	`(?i)googlebot`, `(?i)bingbot`, `(?i)slurp`, `(?i)duckduckbot`, `(?i)baiduspider`,
	`(?i)yandexbot`, `(?i)sogou`, `(?i)exabot`, `(?i)facebot`, `(?i)ia_archiver`,

	// Social Media Bots
	`(?i)facebookexternalhit`, `(?i)twitterbot`, `(?i)linkedinbot`, `(?i)pinterestbot`,
	`(?i)whatsapp`, `(?i)telegrambot`, `(?i)slackbot`, `(?i)discordbot`,

	// SEO & Analytics Bots
	`(?i)ahrefsbot`, `(?i)semrushbot`, `(?i)mj12bot`, `(?i)dotbot`, `(?i)rogerbot`,
	`(?i)blexbot`, `(?i)screaming frog`, `(?i)petalbot`, `(?i)dataforseo`,

	// Scrapers & Crawlers
	`(?i)scrapy`, `(?i)python-requests`, `(?i)go-http-client`, `(?i)wget`, `(?i)curl`,
	`(?i)httrack`, `(?i)webcopier`, `(?i)crawler`, `(?i)spider`, `(?i)scraper`,
	`(?i)bot`, `(?i)crawl`, `(?i)fetch`, `(?i)scan`, `(?i)check`,

	// Monitoring & Uptime Bots
	`(?i)pingdom`, `(?i)uptimerobot`, `(?i)statuscake`, `(?i)newrelic`, `(?i)monitis`,
	`(?i)site24x7`, `(?i)gtmetrix`, `(?i)pagespeed`,

	// Security & Vulnerability Scanners
	`(?i)nmap`, `(?i)nikto`, `(?i)nessus`, `(?i)openvas`, `(?i)masscan`,
	`(?i)acunetix`, `(?i)sqlmap`, `(?i)metasploit`,

	// AI & LLM Bots
	`(?i)gptbot`, `(?i)chatgpt`, `(?i)claudebot`, `(?i)anthropic`, `(?i)cohere`,
	`(?i)perplexitybot`, `(?i)you.com`,

	// Generic Bot Indicators
	`(?i)headless`, `(?i)phantomjs`, `(?i)selenium`, `(?i)webdriver`,
}

var botRegexes []*regexp.Regexp

func init() {
	// Compile semua bot patterns saat startup
	for _, pattern := range BotPatterns {
		if re, err := regexp.Compile(pattern); err == nil {
			botRegexes = append(botRegexes, re)
		}
	}
}

// IsKnownBot mengecek apakah user agent adalah bot berdasarkan pattern matching
func IsKnownBot(uaString string) (bool, string) {
	if uaString == "" {
		return false, ""
	}

	uaLower := strings.ToLower(uaString)

	// Check dengan regex patterns
	for i, re := range botRegexes {
		if re.MatchString(uaLower) {
			// Extract bot type dari pattern yang match
			botType := extractBotType(BotPatterns[i])
			return true, botType
		}
	}

	return false, ""
}

// extractBotType mengambil nama bot dari regex pattern
func extractBotType(pattern string) string {
	// Hapus regex markers
	pattern = strings.TrimPrefix(pattern, "(?i)")
	pattern = strings.ReplaceAll(pattern, "[", "")
	pattern = strings.ReplaceAll(pattern, "]", "")
	pattern = strings.ReplaceAll(pattern, " ", "_")
	return pattern
}

// normalizeOS membersihkan dan menyederhanakan nama OS untuk matching
func normalizeOS(osName string) string {
	if osName == "" {
		return ""
	}

	// iOS iPhone normalization
	if strings.Contains(osName, "iPhone OS") {
		return "iOS"
	}

	// iOS iPad normalization
	if strings.Contains(osName, "CPU OS") && strings.Contains(osName, "like Mac OS X") {
		return "iPadOS"
	}

	// macOS normalization
	if strings.Contains(osName, "Mac OS X") {
		return "macOS"
	}

	// Android normalization (remove version numbers)
	if strings.HasPrefix(osName, "Android") {
		// Extract just "Android" without version
		return "Android"
	}

	// Windows normalization
	if strings.HasPrefix(osName, "Windows") {
		return "Windows"
	}

	// Linux normalization
	if strings.Contains(osName, "Linux") || strings.Contains(osName, "Ubuntu") {
		return "Linux"
	}

	return osName
}

// normalizeBrowser memperbaiki deteksi browser untuk edge cases
func normalizeBrowser(browserName, uaString string) string {
	if browserName == "" {
		return ""
	}

	// Samsung Browser detection
	if strings.Contains(uaString, "SamsungBrowser") {
		return "Samsung Browser"
	}

	// Chrome iOS (CriOS) detection
	if strings.Contains(uaString, "CriOS") {
		return "Chrome"
	}

	// Firefox iOS (FxiOS) detection
	if strings.Contains(uaString, "FxiOS") {
		return "Firefox"
	}

	return browserName
}

// detectDeviceType menentukan tipe device dengan lebih akurat
func detectDeviceType(u *user_agent.UserAgent, uaString string) string {
	// iPad detection
	if strings.Contains(uaString, "iPad") {
		return "Tablet"
	}

	// Android Tablet detection (no "Mobile" keyword)
	if strings.Contains(uaString, "Android") && !strings.Contains(uaString, "Mobile") {
		return "Tablet"
	}

	// Mobile detection
	if u.Mobile() {
		return "Mobile"
	}

	return "Desktop"
}

// Parse mengembalikan os, deviceType, browserName, isBot, botType
func Parse(uaString string) (string, string, string, bool, string) {
	if uaString == "" {
		return "", "", "", false, ""
	}

	u := user_agent.New(uaString)

	// Gabungkan detection dari library + custom patterns
	isBot := u.Bot()
	botType := ""

	if !isBot {
		// Double check dengan custom bot patterns
		isBot, botType = IsKnownBot(uaString)
	} else {
		// Jika library detect bot, coba ambil bot type
		_, botType = IsKnownBot(uaString)
	}

	// Get raw values
	osRaw := u.OS()
	browserRaw, _ := u.Browser()

	// Normalize untuk matching yang lebih baik
	os := normalizeOS(osRaw)
	browserName := normalizeBrowser(browserRaw, uaString)
	device := detectDeviceType(u, uaString)

	return os, device, browserName, isBot, botType
}
