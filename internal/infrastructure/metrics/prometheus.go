// Package metrics provides Prometheus metrics
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// PrometheusMetrics implements domain.Metrics using Prometheus
type PrometheusMetrics struct {
	searchRequests   *prometheus.CounterVec
	searchLatency    *prometheus.HistogramVec
	cacheHits        prometheus.Counter
	cacheMisses      prometheus.Counter
	cacheSize        prometheus.Gauge
	apiErrors        *prometheus.CounterVec
	apiLatency       *prometheus.HistogramVec
	activeRequests   prometheus.Gauge
	requestsTotal    *prometheus.CounterVec
	responseDuration *prometheus.HistogramVec
}

// NewPrometheusMetrics creates a new Prometheus metrics instance
func NewPrometheusMetrics(namespace string) *PrometheusMetrics {
	if namespace == "" {
		namespace = "flight_ibe"
	}

	return &PrometheusMetrics{
		searchRequests: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "search_requests_total",
				Help:      "Total number of flight search requests",
			},
			[]string{"source", "cached"},
		),
		searchLatency: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "search_latency_milliseconds",
				Help:      "Flight search latency in milliseconds",
				Buckets:   []float64{10, 50, 100, 250, 500, 1000, 2500, 5000, 10000},
			},
			[]string{"source"},
		),
		cacheHits: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "cache_hits_total",
				Help:      "Total number of cache hits",
			},
		),
		cacheMisses: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "cache_misses_total",
				Help:      "Total number of cache misses",
			},
		),
		cacheSize: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "cache_size",
				Help:      "Current number of items in cache",
			},
		),
		apiErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "api_errors_total",
				Help:      "Total number of API errors",
			},
			[]string{"operation", "error_type"},
		),
		apiLatency: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "api_latency_milliseconds",
				Help:      "External API latency in milliseconds",
				Buckets:   []float64{100, 250, 500, 1000, 2500, 5000, 10000, 30000},
			},
			[]string{"provider", "operation"},
		),
		activeRequests: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "active_requests",
				Help:      "Number of active requests being processed",
			},
		),
		requestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "http_requests_total",
				Help:      "Total number of HTTP requests",
			},
			[]string{"method", "path", "status"},
		),
		responseDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "http_response_duration_milliseconds",
				Help:      "HTTP response duration in milliseconds",
				Buckets:   []float64{5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000},
			},
			[]string{"method", "path"},
		),
	}
}

// IncrementSearchRequests increments the search request counter
func (m *PrometheusMetrics) IncrementSearchRequests(source string, cached bool) {
	cachedStr := "false"
	if cached {
		cachedStr = "true"
	}
	m.searchRequests.WithLabelValues(source, cachedStr).Inc()
}

// ObserveSearchLatency records search latency
func (m *PrometheusMetrics) ObserveSearchLatency(source string, durationMs float64) {
	m.searchLatency.WithLabelValues(source).Observe(durationMs)
}

// IncrementCacheHits increments cache hit counter
func (m *PrometheusMetrics) IncrementCacheHits() {
	m.cacheHits.Inc()
}

// IncrementCacheMisses increments cache miss counter
func (m *PrometheusMetrics) IncrementCacheMisses() {
	m.cacheMisses.Inc()
}

// SetCacheSize sets the current cache size gauge
func (m *PrometheusMetrics) SetCacheSize(size int) {
	m.cacheSize.Set(float64(size))
}

// IncrementAPIErrors increments API error counter
func (m *PrometheusMetrics) IncrementAPIErrors(operation, errorType string) {
	m.apiErrors.WithLabelValues(operation, errorType).Inc()
}

// ObserveAPILatency records external API latency
func (m *PrometheusMetrics) ObserveAPILatency(provider, operation string, durationMs float64) {
	m.apiLatency.WithLabelValues(provider, operation).Observe(durationMs)
}

// IncrementActiveRequests increments the active request gauge
func (m *PrometheusMetrics) IncrementActiveRequests() {
	m.activeRequests.Inc()
}

// DecrementActiveRequests decrements the active request gauge
func (m *PrometheusMetrics) DecrementActiveRequests() {
	m.activeRequests.Dec()
}

// RecordHTTPRequest records an HTTP request metric
func (m *PrometheusMetrics) RecordHTTPRequest(method, path, status string, durationMs float64) {
	m.requestsTotal.WithLabelValues(method, path, status).Inc()
	m.responseDuration.WithLabelValues(method, path).Observe(durationMs)
}
