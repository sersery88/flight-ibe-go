// Package handlers contains HTTP request handlers
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sersery88/flight-ibe-go/internal/amadeus"
	"github.com/sersery88/flight-ibe-go/internal/models"
)

// FlightHandler handles flight-related API requests
type FlightHandler struct {
	client *amadeus.Client
}

// NewFlightHandler creates a new FlightHandler
func NewFlightHandler(client *amadeus.Client) *FlightHandler {
	return &FlightHandler{client: client}
}

// SearchFlights handles flight search requests
// POST /api/flights/search
func (h *FlightHandler) SearchFlights(c *gin.Context) {
	var req models.FlightSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request",
			"details": err.Error(),
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

	resp, err := h.client.SearchFlightOffers(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Flight search failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// PriceFlights handles flight pricing requests
// POST /api/flights/price
func (h *FlightHandler) PriceFlights(c *gin.Context) {
	var req struct {
		FlightOffers []models.FlightOffer `json:"flightOffers" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request",
			"details": err.Error(),
		})
		return
	}

	resp, err := h.client.PriceFlightOffers(req.FlightOffers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Flight pricing failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// CreateOrder handles booking requests
// POST /api/flights/book
func (h *FlightHandler) CreateOrder(c *gin.Context) {
	var req models.FlightOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request",
			"details": err.Error(),
		})
		return
	}

	resp, err := h.client.CreateFlightOrder(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Booking failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetOrder retrieves an existing booking
// GET /api/flights/orders/:id
func (h *FlightHandler) GetOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order ID required"})
		return
	}

	resp, err := h.client.GetFlightOrder(orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve order",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// CancelOrder cancels a booking
// DELETE /api/flights/orders/:id
func (h *FlightHandler) CancelOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order ID required"})
		return
	}

	if err := h.client.CancelFlightOrder(orderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to cancel order",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order cancelled successfully"})
}

// GetSeatmap retrieves seat map for an offer
// POST /api/flights/seatmap
func (h *FlightHandler) GetSeatmap(c *gin.Context) {
	var req struct {
		FlightOffers []models.FlightOffer `json:"flightOffers" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request",
			"details": err.Error(),
		})
		return
	}

	resp, err := h.client.GetSeatmap(req.FlightOffers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get seatmap",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetFlightStatus checks flight status
// GET /api/flights/status
func (h *FlightHandler) GetFlightStatus(c *gin.Context) {
	carrierCode := c.Query("carrierCode")
	flightNumber := c.Query("flightNumber")
	date := c.Query("date")

	if carrierCode == "" || flightNumber == "" || date == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "carrierCode, flightNumber, and date are required",
		})
		return
	}

	resp, err := h.client.GetFlightStatus(carrierCode, flightNumber, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get flight status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// SearchLocations searches for airports/cities
// GET /api/locations
func (h *FlightHandler) SearchLocations(c *gin.Context) {
	keyword := c.Query("keyword")
	subType := c.DefaultQuery("subType", "AIRPORT,CITY")

	if keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "keyword is required"})
		return
	}

	resp, err := h.client.SearchLocations(keyword, subType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Location search failed",
			"details": err.Error(),
		})
		return
	}

	c.Data(http.StatusOK, "application/json", resp)
}

// GetInspirations finds destinations by budget
// GET /api/flights/inspirations
func (h *FlightHandler) GetInspirations(c *gin.Context) {
	origin := c.Query("origin")
	if origin == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "origin is required"})
		return
	}

	maxPrice := 0
	if mp := c.Query("maxPrice"); mp != "" {
		// Parse max price if provided
	}
	currency := c.DefaultQuery("currency", "EUR")

	resp, err := h.client.GetFlightInspirations(origin, maxPrice, currency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get inspirations",
			"details": err.Error(),
		})
		return
	}

	c.Data(http.StatusOK, "application/json", resp)
}
