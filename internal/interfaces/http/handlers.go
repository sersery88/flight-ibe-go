// Package http provides HTTP handlers
package http

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/sersery88/flight-ibe-go/internal/application"
	"github.com/sersery88/flight-ibe-go/internal/domain"
)

// FlightHandler handles flight-related HTTP requests
type FlightHandler struct {
	service *application.FlightService
	logger  *slog.Logger
}

// NewFlightHandler creates a new FlightHandler
func NewFlightHandler(service *application.FlightService, logger *slog.Logger) *FlightHandler {
	return &FlightHandler{
		service: service,
		logger:  logger,
	}
}

// SearchFlights handles flight search requests
// @Summary Search for flights
// @Description Search for flight offers between two locations
// @Tags flights
// @Accept json
// @Produce json
// @Param request body domain.FlightSearchRequest true "Search parameters"
// @Success 200 {object} domain.FlightSearchResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/flights/search [post]
func (h *FlightHandler) SearchFlights(c *gin.Context) {
	var req domain.FlightSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	// Set defaults
	if req.Adults == 0 {
		req.Adults = 1
	}
	if req.Currency == "" {
		req.Currency = "EUR"
	}

	response, err := h.service.SearchFlights(c.Request.Context(), req)
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "search failed",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "flight search failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// FilterFlights handles flight filtering requests
// @Summary Filter cached flight results
// @Description Apply filters to cached flight search results
// @Tags flights
// @Accept json
// @Produce json
// @Param request body domain.FlightIndexQuery true "Filter parameters"
// @Success 200 {array} domain.FlightOffer
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/flights/filter [post]
func (h *FlightHandler) FilterFlights(c *gin.Context) {
	var query domain.FlightIndexQuery
	if err := c.ShouldBindJSON(&query); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	offers, err := h.service.FilterFlights(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "filter failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  offers,
		"count": len(offers),
	})
}

// PriceFlights handles flight pricing requests
// @Summary Get updated pricing for flights
// @Description Get final pricing for selected flight offers
// @Tags flights
// @Accept json
// @Produce json
// @Param request body PriceRequest true "Flight offers to price"
// @Success 200 {object} domain.FlightSearchResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/flights/price [post]
func (h *FlightHandler) PriceFlights(c *gin.Context) {
	var req PriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	response, err := h.service.PriceFlights(c.Request.Context(), req.FlightOffers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "pricing failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CreateBooking handles booking creation requests
// @Summary Create a flight booking
// @Description Book selected flight offers
// @Tags bookings
// @Accept json
// @Produce json
// @Param request body domain.BookingRequest true "Booking details"
// @Success 201 {object} domain.FlightOrder
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/flights/book [post]
func (h *FlightHandler) CreateBooking(c *gin.Context) {
	var req domain.BookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	order, err := h.service.CreateBooking(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "booking failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, order)
}

// GetBooking handles booking retrieval requests
// @Summary Get a booking by ID
// @Description Retrieve an existing booking
// @Tags bookings
// @Produce json
// @Param id path string true "Order ID"
// @Success 200 {object} domain.FlightOrder
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/flights/orders/{id} [get]
func (h *FlightHandler) GetBooking(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "order ID required"})
		return
	}

	order, err := h.service.GetBooking(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "failed to retrieve order",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, order)
}

// CancelBooking handles booking cancellation requests
// @Summary Cancel a booking
// @Description Cancel an existing booking
// @Tags bookings
// @Param id path string true "Order ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/flights/orders/{id} [delete]
func (h *FlightHandler) CancelBooking(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "order ID required"})
		return
	}

	if err := h.service.CancelBooking(c.Request.Context(), orderID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "cancellation failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{Message: "order cancelled successfully"})
}

// Request/Response types

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Message string `json:"message"`
}

// PriceRequest represents a pricing request
type PriceRequest struct {
	FlightOffers []domain.FlightOffer `json:"flightOffers" binding:"required"`
}

// HealthHandler handles health check requests
type HealthHandler struct {
	checks []domain.HealthChecker
	logger *slog.Logger
}

// NewHealthHandler creates a new HealthHandler
func NewHealthHandler(checks []domain.HealthChecker, logger *slog.Logger) *HealthHandler {
	return &HealthHandler{
		checks: checks,
		logger: logger,
	}
}

// Health returns the health status
// @Summary Health check
// @Description Returns the health status of the service
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (h *HealthHandler) Health(c *gin.Context) {
	response := HealthResponse{
		Status: "healthy",
		Checks: make(map[string]domain.HealthStatus),
	}

	overallHealthy := true
	for _, check := range h.checks {
		status := check.Check(c.Request.Context())
		response.Checks[check.Name()] = status
		if status.Status != "healthy" {
			overallHealthy = false
		}
	}

	if !overallHealthy {
		response.Status = "degraded"
	}

	statusCode := http.StatusOK
	if response.Status != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// Liveness returns a simple liveness check
// @Summary Liveness probe
// @Description Returns 200 if the service is alive
// @Tags health
// @Success 200 {object} map[string]string
// @Router /health/live [get]
func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "alive"})
}

// Readiness returns a readiness check
// @Summary Readiness probe
// @Description Returns 200 if the service is ready to accept traffic
// @Tags health
// @Success 200 {object} map[string]string
// @Failure 503 {object} map[string]string
// @Router /health/ready [get]
func (h *HealthHandler) Readiness(c *gin.Context) {
	for _, check := range h.checks {
		status := check.Check(c.Request.Context())
		if status.Status == "unhealthy" {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "not ready",
				"reason": check.Name() + ": " + status.Message,
			})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status string                          `json:"status"`
	Checks map[string]domain.HealthStatus  `json:"checks,omitempty"`
}
