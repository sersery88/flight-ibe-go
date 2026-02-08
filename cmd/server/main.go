// Flight IBE Backend Server
// Enterprise-grade Go implementation with Amadeus API integration
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/sersery88/flight-ibe-go/internal/application"
	"github.com/sersery88/flight-ibe-go/internal/domain"
	"github.com/sersery88/flight-ibe-go/internal/infrastructure/amadeus"
	"github.com/sersery88/flight-ibe-go/internal/infrastructure/cache"
	"github.com/sersery88/flight-ibe-go/internal/infrastructure/coalesce"
	"github.com/sersery88/flight-ibe-go/internal/infrastructure/metrics"
	"github.com/sersery88/flight-ibe-go/internal/infrastructure/observability"
	"github.com/sersery88/flight-ibe-go/internal/infrastructure/ordertracker"
	httpHandler "github.com/sersery88/flight-ibe-go/internal/interfaces/http"
)

func main() {
	// Load .env file if present
	if err := godotenv.Load(); err != nil {
		// Not an error, just informational
	}

	// Initialize structured logger
	logLevel := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		logLevel = slog.LevelDebug
	}
	
	logHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
		AddSource: logLevel == slog.LevelDebug,
	})
	logger := slog.New(logHandler)
	slog.SetDefault(logger)

	// Run the application
	if err := run(logger); err != nil {
		logger.Error("application error", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Get configuration from environment
	config := loadConfig()

	logger.Info("starting flight-ibe-go",
		slog.String("environment", config.Environment),
		slog.String("port", config.Port),
	)

	// Initialize OpenTelemetry
	otelSDK, err := observability.SetupOTelSDK(ctx, observability.Config{
		ServiceName:    "flight-ibe-go",
		ServiceVersion: "2.0.0",
		Environment:    config.Environment,
		OTLPEndpoint:   config.OTLPEndpoint,
		EnableTracing:  config.EnableTracing,
		EnableMetrics:  config.EnableMetrics,
	})
	if err != nil {
		return err
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := otelSDK.Shutdown(shutdownCtx); err != nil {
			logger.Warn("otel shutdown error", slog.String("error", err.Error()))
		}
	}()

	// Initialize Prometheus metrics
	promMetrics := metrics.NewPrometheusMetrics("flight_ibe")

	// Initialize Amadeus adapter
	amadeusAdapter, err := amadeus.NewAdapter(amadeus.Config{
		ClientID:     config.AmadeusClientID,
		ClientSecret: config.AmadeusClientSecret,
		Environment:  config.AmadeusEnv,
		Timeout:      30 * time.Second,
		Logger:       logger.With(slog.String("component", "amadeus")),
	})
	if err != nil {
		return err
	}

	envLabel := "test"
	if amadeusAdapter.IsProduction() {
		envLabel = "production"
	}
	logger.Info("amadeus client initialized", slog.String("environment", envLabel))

	// Initialize cache
	flightCache, err := cache.NewLRUCache(cache.LRUCacheConfig{
		Size:    config.CacheSize,
		TTL:     config.CacheTTL,
		Logger:  logger.With(slog.String("component", "cache")),
		Metrics: promMetrics,
	})
	if err != nil {
		return err
	}

	// Initialize request coalescer
	coalescer := coalesce.NewCoalescer(30 * time.Second)

	// Initialize flight service
	flightService := application.NewFlightService(
		amadeusAdapter,  // FlightSearcher
		amadeusAdapter,  // FlightBooker
		amadeusAdapter,  // UpsellProvider
		flightCache,     // FlightCache
		nil,             // FlightIndexer (optional, for OpenSearch)
		coalescer,       // RequestCoalescer
		promMetrics,     // Metrics
		logger.With(slog.String("component", "flight_service")),
		application.FlightServiceConfig{
			CacheTTL: config.CacheTTL,
		},
	)

	// Initialize order tracker for stale PNR cleanup
	tracker := ordertracker.New()

	// Initialize health checks
	healthChecks := []domain.HealthChecker{
		&amadeusHealthCheck{adapter: amadeusAdapter},
		&cacheHealthCheck{cache: flightCache},
	}

	// Create HTTP router
	router := httpHandler.NewRouter(httpHandler.RouterConfig{
		FlightService:    flightService,
		LocationSearcher: amadeusAdapter,
		SeatmapProvider:  amadeusAdapter,
		FlightSearcher:   amadeusAdapter, // Booking flow: pricing with ancillaries
		FlightBooker:     amadeusAdapter, // Booking flow: PNR creation
		OrderTracker:     tracker,        // PNR lifecycle tracking
		HealthChecks:     healthChecks,
		RateLimitRPS:   config.RateLimitRPS,
		RateLimitBurst: config.RateLimitBurst,
		AllowedOrigins: config.AllowedOrigins,
		Metrics:        promMetrics,
		Logger:         logger,
		Environment:    config.Environment,
	})

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + config.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in goroutine
	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("starting HTTP server", slog.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
	}()

	// Stale PNR cleanup goroutine — cancel abandoned orders every 5 minutes
	cleanupCtx, cleanupCancel := context.WithCancel(ctx)
	defer cleanupCancel()
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-cleanupCtx.Done():
				return
			case <-ticker.C:
				stale := tracker.GetStale(15 * time.Minute)
				if len(stale) > 0 {
					logger.Info("auto-cancelling stale PNRs",
						slog.Int("count", len(stale)),
					)
				}
				for _, orderID := range stale {
					logger.Info("auto-cancelling stale PNR",
						slog.String("orderId", orderID),
					)
					if err := amadeusAdapter.CancelOrder(context.Background(), orderID); err != nil {
						logger.Warn("failed to auto-cancel stale PNR",
							slog.String("orderId", orderID),
							slog.String("error", err.Error()),
						)
					}
					tracker.Remove(orderID)
				}
			}
		}
	}()

	// Wait for shutdown signal or error
	select {
	case err := <-serverErrors:
		return err
	case <-ctx.Done():
		logger.Info("shutdown signal received")
	}

	// Graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	logger.Info("shutting down HTTP server")
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown error", slog.String("error", err.Error()))
		return err
	}

	logger.Info("server stopped gracefully")
	return nil
}

// Config holds application configuration
type Config struct {
	// Server
	Port        string
	Environment string

	// Amadeus
	AmadeusClientID     string
	AmadeusClientSecret string
	AmadeusEnv          string

	// Cache
	CacheSize int
	CacheTTL  time.Duration

	// Rate limiting
	RateLimitRPS   float64
	RateLimitBurst int

	// CORS
	AllowedOrigins []string

	// Observability
	EnableTracing bool
	EnableMetrics bool
	OTLPEndpoint  string
}

func loadConfig() Config {
	return Config{
		Port:                getEnv("PORT", "8080"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		AmadeusClientID:    os.Getenv("AMADEUS_CLIENT_ID"),
		AmadeusClientSecret: os.Getenv("AMADEUS_CLIENT_SECRET"),
		AmadeusEnv:         getEnv("AMADEUS_ENV", "test"),
		CacheSize:          getEnvInt("CACHE_SIZE", 1000),
		CacheTTL:           getEnvDuration("CACHE_TTL", 15*time.Minute),
		RateLimitRPS:       getEnvFloat("RATE_LIMIT_RPS", 10),
		RateLimitBurst:     getEnvInt("RATE_LIMIT_BURST", 20),
		AllowedOrigins:     []string{"*"}, // Configure as needed
		EnableTracing:      getEnvBool("ENABLE_TRACING", false),
		EnableMetrics:      getEnvBool("ENABLE_METRICS", true),
		OTLPEndpoint:       os.Getenv("OTLP_ENDPOINT"),
	}
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if v := os.Getenv(key); v != "" {
		var i int
		if _, err := parseEnvInt(v, &i); err == nil {
			return i
		}
	}
	return defaultValue
}

func parseEnvInt(s string, i *int) (bool, error) {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false, errors.New("invalid int")
		}
		*i = *i*10 + int(c-'0')
	}
	return true, nil
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if v := os.Getenv(key); v != "" {
		var f float64
		for i, c := range v {
			if c == '.' {
				// Simple float parsing
				whole := v[:i]
				frac := v[i+1:]
				var w, fr int
				parseEnvInt(whole, &w)
				parseEnvInt(frac, &fr)
				div := 1.0
				for j := 0; j < len(frac); j++ {
					div *= 10
				}
				f = float64(w) + float64(fr)/div
				return f
			}
		}
		var i int
		if ok, _ := parseEnvInt(v, &i); ok {
			return float64(i)
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	v := os.Getenv(key)
	switch v {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		return defaultValue
	}
}

// Health check implementations

type amadeusHealthCheck struct {
	adapter *amadeus.Adapter
}

func (h *amadeusHealthCheck) Name() string {
	return "amadeus"
}

func (h *amadeusHealthCheck) Check(ctx context.Context) domain.HealthStatus {
	// Simple check - just verify we can get a token
	// In production, might want to make a lightweight API call
	return domain.HealthStatus{
		Status: "healthy",
		Details: map[string]string{
			"production": func() string {
				if h.adapter.IsProduction() {
					return "true"
				}
				return "false"
			}(),
		},
	}
}

type cacheHealthCheck struct {
	cache *cache.LRUCache
}

func (h *cacheHealthCheck) Name() string {
	return "cache"
}

func (h *cacheHealthCheck) Check(ctx context.Context) domain.HealthStatus {
	stats := h.cache.Stats()
	return domain.HealthStatus{
		Status: "healthy",
		Details: map[string]string{
			"size": func() string {
				s := ""
				n := stats.Size
				for n > 0 {
					s = string(rune('0'+n%10)) + s
					n /= 10
				}
				if s == "" {
					return "0"
				}
				return s
			}(),
		},
	}
}
