package metrics

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

// Metrics holds all application metrics
type Metrics struct {
	mu sync.RWMutex

	// Request metrics
	RequestsTotal      map[string]int64  // by endpoint
	RequestDuration    map[string][]int64 // by endpoint (milliseconds)
	RequestErrors      map[string]int64  // by endpoint
	
	// Link metrics
	LinksTotal         int64
	LinksActive        int64
	RedirectsTotal     int64
	RedirectsBlocked   int64
	
	// Rate limit metrics
	RateLimitHits      int64
	RateLimitMisses    int64
	
	// Node metrics
	NodesOnline        int64
	NodesOffline       int64
	
	// System metrics
	StartTime          time.Time
	LastRequestTime    time.Time
}

var (
	globalMetrics *Metrics
	once          sync.Once
)

// GetMetrics returns the global metrics instance
func GetMetrics() *Metrics {
	once.Do(func() {
		globalMetrics = &Metrics{
			RequestsTotal:   make(map[string]int64),
			RequestDuration: make(map[string][]int64),
			RequestErrors:   make(map[string]int64),
			StartTime:       time.Now(),
		}
	})
	return globalMetrics
}

// RecordRequest records a request metric
func (m *Metrics) RecordRequest(endpoint string, duration time.Duration, isError bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.RequestsTotal[endpoint]++
	m.LastRequestTime = time.Now()

	// Store duration in milliseconds
	durationMs := duration.Milliseconds()
	m.RequestDuration[endpoint] = append(m.RequestDuration[endpoint], durationMs)

	// Keep only last 1000 durations per endpoint
	if len(m.RequestDuration[endpoint]) > 1000 {
		m.RequestDuration[endpoint] = m.RequestDuration[endpoint][1:]
	}

	if isError {
		m.RequestErrors[endpoint]++
	}
}

// IncrementRedirects increments redirect counter
func (m *Metrics) IncrementRedirects() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.RedirectsTotal++
}

// IncrementBlockedRedirects increments blocked redirect counter
func (m *Metrics) IncrementBlockedRedirects() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.RedirectsBlocked++
}

// RecordRateLimitCheck records rate limit check result
func (m *Metrics) RecordRateLimitCheck(allowed bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if allowed {
		m.RateLimitMisses++
	} else {
		m.RateLimitHits++
	}
}

// UpdateNodeCount updates online/offline node counts
func (m *Metrics) UpdateNodeCount(online, offline int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.NodesOnline = online
	m.NodesOffline = offline
}

// UpdateLinkCount updates link counts
func (m *Metrics) UpdateLinkCount(total, active int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.LinksTotal = total
	m.LinksActive = active
}

// GetPrometheusMetrics returns metrics in Prometheus format
func (m *Metrics) GetPrometheusMetrics() string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var output string

	// System metrics
	uptime := time.Since(m.StartTime).Seconds()
	output += "# HELP nexus_uptime_seconds Application uptime in seconds\n"
	output += "# TYPE nexus_uptime_seconds counter\n"
	output += "nexus_uptime_seconds " + strconv.FormatFloat(uptime, 'f', 2, 64) + "\n\n"

	// Request metrics
	output += "# HELP nexus_requests_total Total number of requests by endpoint\n"
	output += "# TYPE nexus_requests_total counter\n"
	for endpoint, count := range m.RequestsTotal {
		output += "nexus_requests_total{endpoint=\"" + endpoint + "\"} " + strconv.FormatInt(count, 10) + "\n"
	}
	output += "\n"

	// Error metrics
	output += "# HELP nexus_requests_errors_total Total number of request errors by endpoint\n"
	output += "# TYPE nexus_requests_errors_total counter\n"
	for endpoint, count := range m.RequestErrors {
		output += "nexus_requests_errors_total{endpoint=\"" + endpoint + "\"} " + strconv.FormatInt(count, 10) + "\n"
	}
	output += "\n"

	// Average duration per endpoint
	output += "# HELP nexus_request_duration_avg_ms Average request duration in milliseconds\n"
	output += "# TYPE nexus_request_duration_avg_ms gauge\n"
	for endpoint, durations := range m.RequestDuration {
		if len(durations) > 0 {
			var sum int64
			for _, d := range durations {
				sum += d
			}
			avg := sum / int64(len(durations))
			output += "nexus_request_duration_avg_ms{endpoint=\"" + endpoint + "\"} " + strconv.FormatInt(avg, 10) + "\n"
		}
	}
	output += "\n"

	// Link metrics
	output += "# HELP nexus_links_total Total number of links\n"
	output += "# TYPE nexus_links_total gauge\n"
	output += "nexus_links_total " + strconv.FormatInt(m.LinksTotal, 10) + "\n\n"

	output += "# HELP nexus_links_active Number of active links\n"
	output += "# TYPE nexus_links_active gauge\n"
	output += "nexus_links_active " + strconv.FormatInt(m.LinksActive, 10) + "\n\n"

	// Redirect metrics
	output += "# HELP nexus_redirects_total Total number of successful redirects\n"
	output += "# TYPE nexus_redirects_total counter\n"
	output += "nexus_redirects_total " + strconv.FormatInt(m.RedirectsTotal, 10) + "\n\n"

	output += "# HELP nexus_redirects_blocked_total Total number of blocked redirects\n"
	output += "# TYPE nexus_redirects_blocked_total counter\n"
	output += "nexus_redirects_blocked_total " + strconv.FormatInt(m.RedirectsBlocked, 10) + "\n\n"

	// Rate limit metrics
	output += "# HELP nexus_ratelimit_hits_total Total number of rate limit hits (blocked)\n"
	output += "# TYPE nexus_ratelimit_hits_total counter\n"
	output += "nexus_ratelimit_hits_total " + strconv.FormatInt(m.RateLimitHits, 10) + "\n\n"

	output += "# HELP nexus_ratelimit_misses_total Total number of rate limit misses (allowed)\n"
	output += "# TYPE nexus_ratelimit_misses_total counter\n"
	output += "nexus_ratelimit_misses_total " + strconv.FormatInt(m.RateLimitMisses, 10) + "\n\n"

	// Node metrics
	output += "# HELP nexus_nodes_online Number of online nodes\n"
	output += "# TYPE nexus_nodes_online gauge\n"
	output += "nexus_nodes_online " + strconv.FormatInt(m.NodesOnline, 10) + "\n\n"

	output += "# HELP nexus_nodes_offline Number of offline nodes\n"
	output += "# TYPE nexus_nodes_offline gauge\n"
	output += "nexus_nodes_offline " + strconv.FormatInt(m.NodesOffline, 10) + "\n\n"

	return output
}

// MetricsHandler returns HTTP handler for /metrics endpoint
func MetricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		w.WriteHeader(http.StatusOK)
		
		metrics := GetMetrics()
		w.Write([]byte(metrics.GetPrometheusMetrics()))
	}
}
