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

// UpsellFlights handles branded fare / upsell requests
// @Summary Get branded fare upsell options
// @Description Get branded fare variants for selected flight offers
// @Tags flights
// @Accept json
// @Produce json
// @Param request body UpsellRequest true "Flight offers to upsell"
// @Success 200 {object} domain.FlightSearchResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/flights/upsell [post]
func (h *FlightHandler) UpsellFlights(c *gin.Context) {
	var req UpsellRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	response, err := h.service.UpsellFlights(c.Request.Context(), req.FlightOffers)
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "upsell failed",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "upsell request failed",
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

// LocationHandler handles location search HTTP requests
type LocationHandler struct {
	searcher domain.LocationSearcher
	logger   *slog.Logger
}

// NewLocationHandler creates a new LocationHandler
func NewLocationHandler(searcher domain.LocationSearcher, logger *slog.Logger) *LocationHandler {
	return &LocationHandler{
		searcher: searcher,
		logger:   logger,
	}
}

// SearchLocations handles location search requests
// @Summary Search locations
// @Description Search for airports and cities by keyword
// @Tags locations
// @Produce json
// @Param keyword query string true "Search keyword (min 1 char)"
// @Param subType query string false "Location subtype filter" default(CITY,AIRPORT)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/locations [get]
func (h *LocationHandler) SearchLocations(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: "keyword parameter is required",
		})
		return
	}

	subType := c.DefaultQuery("subType", "CITY,AIRPORT")

	h.logger.InfoContext(c.Request.Context(), "searching locations",
		slog.String("keyword", keyword),
		slog.String("subType", subType),
	)

	results, err := h.searcher.SearchLocations(c.Request.Context(), keyword, subType)
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "location search failed",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "location search failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": results,
	})
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

// UpsellRequest represents an upsell/branded fares request
type UpsellRequest struct {
	FlightOffers []domain.FlightOffer `json:"flightOffers" binding:"required"`
}

// SeatmapRequest represents a seatmap request
type SeatmapRequest struct {
	Offer *domain.FlightOffer `json:"offer" binding:"required"`
}

// SeatmapHandler handles seatmap-related HTTP requests
type SeatmapHandler struct {
	provider domain.SeatmapProvider
	logger   *slog.Logger
}

// NewSeatmapHandler creates a new SeatmapHandler
func NewSeatmapHandler(provider domain.SeatmapProvider, logger *slog.Logger) *SeatmapHandler {
	return &SeatmapHandler{
		provider: provider,
		logger:   logger,
	}
}

// GetSeatmap handles seatmap retrieval requests
// @Summary Get seatmap for a flight offer
// @Description Retrieves seatmap data for a given flight offer
// @Tags flights
// @Accept json
// @Produce json
// @Param request body SeatmapRequest true "Flight offer"
// @Success 200 {object} domain.SeatmapResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/flights/seatmap [post]
func (h *SeatmapHandler) GetSeatmap(c *gin.Context) {
	var req SeatmapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "fetching seatmap",
		slog.String("offerId", req.Offer.ID),
	)

	response, err := h.provider.GetSeatmap(c.Request.Context(), []domain.FlightOffer{*req.Offer})
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "seatmap request failed",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "seatmap request failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
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

// === Order Handler (Booking Flow) ===

// OrderHandler handles booking flow order-related HTTP requests
type OrderHandler struct {
	searcher domain.FlightSearcher
	booker   domain.FlightBooker
	seatmap  domain.SeatmapProvider
	logger   *slog.Logger
}

// NewOrderHandler creates a new OrderHandler
func NewOrderHandler(searcher domain.FlightSearcher, booker domain.FlightBooker, seatmap domain.SeatmapProvider, logger *slog.Logger) *OrderHandler {
	return &OrderHandler{
		searcher: searcher,
		booker:   booker,
		seatmap:  seatmap,
		logger:   logger,
	}
}

// PriceOffers handles pricing with ancillaries
// POST /api/flights/price-ancillaries
func (h *OrderHandler) PriceOffers(c *gin.Context) {
	var req domain.PricingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.ErrorContext(c.Request.Context(), "invalid pricing request",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	if len(req.Offers) == 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: "at least one flight offer is required",
		})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "pricing offers with ancillaries",
		slog.Int("offerCount", len(req.Offers)),
		slog.Any("include", req.Include),
	)

	response, err := h.searcher.PriceOffersWithAncillaries(c.Request.Context(), req.Offers, req.Include)
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "pricing with ancillaries failed",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "pricing failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CreateOrder handles PNR creation
// POST /api/flights/order
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req domain.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.ErrorContext(c.Request.Context(), "invalid create order request",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: err.Error(),
		})
		return
	}

	if len(req.Travelers) == 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: "at least one traveler is required",
		})
		return
	}

	if req.Contact.Email == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid request",
			Details: "contact email is required",
		})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "creating booking order",
		slog.Int("travelerCount", len(req.Travelers)),
		slog.String("contactEmail", req.Contact.Email),
	)

	response, err := h.booker.CreateBookingOrder(c.Request.Context(), req)
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "create booking order failed",
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "booking order creation failed",
			Details: err.Error(),
		})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "booking order created",
		slog.String("orderId", response.OrderID),
		slog.String("pnr", response.PNRReference),
	)

	c.JSON(http.StatusCreated, response)
}

// GetOrder retrieves a booking order
// GET /api/flights/order/:id
func (h *OrderHandler) GetOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "order ID required"})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "getting booking order",
		slog.String("orderId", orderID),
	)

	response, err := h.booker.GetBookingOrder(c.Request.Context(), orderID)
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "get booking order failed",
			slog.String("orderId", orderID),
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "failed to retrieve order",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CancelOrder cancels a booking order
// DELETE /api/flights/order/:id
func (h *OrderHandler) CancelOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "order ID required"})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "cancelling booking order",
		slog.String("orderId", orderID),
	)

	if err := h.booker.CancelOrder(c.Request.Context(), orderID); err != nil {
		h.logger.ErrorContext(c.Request.Context(), "cancel booking order failed",
			slog.String("orderId", orderID),
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "cancellation failed",
			Details: err.Error(),
		})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "booking order cancelled",
		slog.String("orderId", orderID),
	)

	c.JSON(http.StatusOK, SuccessResponse{Message: "order cancelled successfully"})
}

// CancelOrderBeacon cancels a booking order (POST variant for sendBeacon)
// POST /api/flights/order/:id/cancel
func (h *OrderHandler) CancelOrderBeacon(c *gin.Context) {
	h.CancelOrder(c)
}

// GetSeatmapByOrder retrieves seatmap for a booking order
// GET /api/flights/seatmap/order/:id
func (h *OrderHandler) GetSeatmapByOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "order ID required"})
		return
	}

	h.logger.InfoContext(c.Request.Context(), "fetching seatmap by order",
		slog.String("orderId", orderID),
	)

	response, err := h.seatmap.GetSeatmapByOrder(c.Request.Context(), orderID)
	if err != nil {
		h.logger.ErrorContext(c.Request.Context(), "seatmap by order failed",
			slog.String("orderId", orderID),
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "seatmap request failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}
