// Flight IBE Backend Server
// Go implementation with Amadeus API integration
package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/time/rate"

	"github.com/sersery88/flight-ibe-go/internal/amadeus"
	"github.com/sersery88/flight-ibe-go/internal/handlers"
	"github.com/sersery88/flight-ibe-go/internal/middleware"
)

func main() {
	// Load .env file if present
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize Amadeus client
	amadeusClient, err := amadeus.NewClient()
	if err != nil {
		log.Fatalf("Failed to initialize Amadeus client: %v", err)
	}

	env := "test"
	if amadeusClient.IsProduction() {
		env = "production"
	}
	log.Printf("Amadeus client initialized (environment: %s)", env)

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	r := gin.New()

	// Middleware
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestLogger())

	// CORS configuration
	corsConfig := cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}
	r.Use(cors.New(corsConfig))

	// Rate limiting: 10 requests/second, burst of 20
	rateLimiter := middleware.NewRateLimiter(rate.Limit(10), 20)
	r.Use(rateLimiter.Middleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"environment": env,
		})
	})

	// Initialize handlers
	flightHandler := handlers.NewFlightHandler(amadeusClient)

	// API routes
	api := r.Group("/api")
	{
		// Flight search & booking
		flights := api.Group("/flights")
		{
			flights.POST("/search", flightHandler.SearchFlights)
			flights.POST("/price", flightHandler.PriceFlights)
			flights.POST("/book", flightHandler.CreateOrder)
			flights.GET("/orders/:id", flightHandler.GetOrder)
			flights.DELETE("/orders/:id", flightHandler.CancelOrder)
			flights.POST("/seatmap", flightHandler.GetSeatmap)
			flights.GET("/status", flightHandler.GetFlightStatus)
			flights.GET("/inspirations", flightHandler.GetInspirations)
		}

		// Reference data
		api.GET("/locations", flightHandler.SearchLocations)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
