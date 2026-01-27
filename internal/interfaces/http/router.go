// Package http provides HTTP router setup
package http

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/time/rate"

	"github.com/sersery88/flight-ibe-go/internal/application"
	"github.com/sersery88/flight-ibe-go/internal/domain"
	"github.com/sersery88/flight-ibe-go/internal/infrastructure/metrics"
)

// RouterConfig contains router configuration
type RouterConfig struct {
	// Service dependencies
	FlightService *application.FlightService
	
	// Health checks
	HealthChecks []domain.HealthChecker
	
	// Middleware config
	RateLimitRPS   float64
	RateLimitBurst int
	
	// CORS
	AllowedOrigins []string
	
	// Observability
	Metrics *metrics.PrometheusMetrics
	Logger  *slog.Logger
	
	// Environment
	Environment string
}

// NewRouter creates a configured Gin router
func NewRouter(config RouterConfig) *gin.Engine {
	// Set Gin mode based on environment
	if config.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Apply middleware
	router.Use(Recovery(config.Logger))
	router.Use(RequestID())
	router.Use(StructuredLogger(config.Logger))
	
	if config.Metrics != nil {
		router.Use(MetricsMiddleware(config.Metrics))
	}
	
	// Tracing
	router.Use(TracingMiddleware("flight-ibe-go"))

	// CORS
	allowedOrigins := config.AllowedOrigins
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"*"}
	}
	router.Use(CORS(CORSConfig{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Rate limiting
	rps := rate.Limit(config.RateLimitRPS)
	if rps == 0 {
		rps = 10
	}
	burst := config.RateLimitBurst
	if burst == 0 {
		burst = 20
	}
	rateLimiter := NewRateLimiter(rps, burst, config.Logger)
	router.Use(rateLimiter.Middleware())

	// Health endpoints (no rate limiting)
	healthHandler := NewHealthHandler(config.HealthChecks, config.Logger)
	router.GET("/health", healthHandler.Health)
	router.GET("/health/live", healthHandler.Liveness)
	router.GET("/health/ready", healthHandler.Readiness)

	// Metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	flightHandler := NewFlightHandler(config.FlightService, config.Logger)
	
	// API v1
	v1 := router.Group("/api/v1")
	{
		flights := v1.Group("/flights")
		{
			flights.POST("/search", flightHandler.SearchFlights)
			flights.POST("/filter", flightHandler.FilterFlights)
			flights.POST("/price", flightHandler.PriceFlights)
			flights.POST("/book", flightHandler.CreateBooking)
			flights.GET("/orders/:id", flightHandler.GetBooking)
			flights.DELETE("/orders/:id", flightHandler.CancelBooking)
		}
	}

	// Legacy API routes (for backward compatibility)
	api := router.Group("/api")
	{
		flights := api.Group("/flights")
		{
			flights.POST("/search", flightHandler.SearchFlights)
			flights.POST("/price", flightHandler.PriceFlights)
			flights.POST("/book", flightHandler.CreateBooking)
			flights.GET("/orders/:id", flightHandler.GetBooking)
			flights.DELETE("/orders/:id", flightHandler.CancelBooking)
		}
	}

	return router
}
