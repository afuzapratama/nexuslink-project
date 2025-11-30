package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/afuzapratama/nexuslink/internal/models"
)

const (
	maxRetries     = 3
	initialBackoff = 1 * time.Second
)

// DeliveryResult represents the result of a webhook delivery attempt
type DeliveryResult struct {
	Success      bool
	StatusCode   int
	ResponseBody string
	Error        error
	Attempt      int
}

// Sender handles webhook delivery with retry logic
type Sender struct {
	httpClient *http.Client
}

// NewSender creates a new webhook sender
func NewSender() *Sender {
	return &Sender{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendWebhook sends a webhook payload to the specified URL with HMAC signature
func (s *Sender) SendWebhook(ctx context.Context, webhook *models.Webhook, payload *models.WebhookPayload) (*DeliveryResult, error) {
	// Marshal payload to JSON
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Generate HMAC signature
	signature := generateSignature(payloadBytes, webhook.Secret)

	// Retry logic with exponential backoff
	backoff := initialBackoff
	for attempt := 1; attempt <= maxRetries; attempt++ {
		result := s.attemptDelivery(ctx, webhook.URL, payloadBytes, signature, attempt)

		if result.Success {
			log.Printf("Webhook delivered successfully: id=%s url=%s event=%s attempt=%d status=%d",
				webhook.ID, webhook.URL, payload.Event, attempt, result.StatusCode)
			return result, nil
		}

		// Log failed attempt
		log.Printf("Webhook delivery failed: id=%s url=%s event=%s attempt=%d/%d error=%v",
			webhook.ID, webhook.URL, payload.Event, attempt, maxRetries, result.Error)

		// Don't retry on client errors (4xx)
		if result.StatusCode >= 400 && result.StatusCode < 500 {
			log.Printf("Webhook delivery aborted due to client error: id=%s status=%d", webhook.ID, result.StatusCode)
			return result, nil
		}

		// Wait before next retry (except on last attempt)
		if attempt < maxRetries {
			select {
			case <-ctx.Done():
				return result, ctx.Err()
			case <-time.After(backoff):
				backoff *= 2 // Exponential backoff: 1s, 2s, 4s
			}
		} else {
			// Last attempt failed
			log.Printf("Webhook delivery exhausted retries: id=%s url=%s event=%s", webhook.ID, webhook.URL, payload.Event)
			return result, nil
		}
	}

	return nil, fmt.Errorf("unexpected error: retry loop ended without result")
}

// attemptDelivery makes a single HTTP POST attempt to deliver the webhook
func (s *Sender) attemptDelivery(ctx context.Context, url string, payloadBytes []byte, signature string, attempt int) *DeliveryResult {
	result := &DeliveryResult{
		Attempt: attempt,
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payloadBytes))
	if err != nil {
		result.Error = fmt.Errorf("failed to create request: %w", err)
		return result
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Signature", signature)
	req.Header.Set("User-Agent", "NexusLink-Webhook/1.0")

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		result.Error = fmt.Errorf("http request failed: %w", err)
		return result
	}
	defer resp.Body.Close()

	result.StatusCode = resp.StatusCode

	// Read response body
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024)) // Max 1MB
	if err != nil {
		result.ResponseBody = fmt.Sprintf("failed to read response: %v", err)
	} else {
		result.ResponseBody = string(bodyBytes)
	}

	// Check if successful (2xx status code)
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		result.Success = true
	} else {
		result.Error = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return result
}

// generateSignature creates an HMAC-SHA256 signature of the payload
func generateSignature(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return hex.EncodeToString(h.Sum(nil))
}

// VerifySignature verifies an HMAC-SHA256 signature
func VerifySignature(payload []byte, signature, secret string) bool {
	expectedSignature := generateSignature(payload, secret)
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}
