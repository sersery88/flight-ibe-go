package amadeus

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/sersery88/flight-ibe-go/internal/models"
)

// SearchFlightOffers searches for flight offers
// API: GET /v2/shopping/flight-offers
func (c *Client) SearchFlightOffers(req models.FlightSearchRequest) (*models.FlightOffersResponse, error) {
	params := url.Values{}
	params.Set("originLocationCode", req.Origin)
	params.Set("destinationLocationCode", req.Destination)
	params.Set("departureDate", req.DepartureDate)
	params.Set("adults", strconv.Itoa(req.Adults))

	if req.ReturnDate != "" {
		params.Set("returnDate", req.ReturnDate)
	}
	if req.Children > 0 {
		params.Set("children", strconv.Itoa(req.Children))
	}
	if req.Infants > 0 {
		params.Set("infants", strconv.Itoa(req.Infants))
	}
	if req.TravelClass != "" {
		params.Set("travelClass", req.TravelClass)
	}
	if req.NonStop {
		params.Set("nonStop", "true")
	}
	if req.Currency != "" {
		params.Set("currencyCode", req.Currency)
	}
	if req.MaxPrice > 0 {
		params.Set("maxPrice", strconv.Itoa(req.MaxPrice))
	}
	if req.MaxResults > 0 {
		params.Set("max", strconv.Itoa(req.MaxResults))
	}
	if len(req.IncludedAirlines) > 0 {
		params.Set("includedAirlineCodes", strings.Join(req.IncludedAirlines, ","))
	}
	if len(req.ExcludedAirlines) > 0 {
		params.Set("excludedAirlineCodes", strings.Join(req.ExcludedAirlines, ","))
	}

	path := "/v2/shopping/flight-offers?" + params.Encode()
	body, err := c.Get(path)
	if err != nil {
		return nil, err
	}

	var resp models.FlightOffersResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}

// PriceFlightOffers gets final pricing for selected offers
// API: POST /v1/shopping/flight-offers/pricing
func (c *Client) PriceFlightOffers(offers []models.FlightOffer) (*models.FlightOffersResponse, error) {
	reqBody := map[string]interface{}{
		"data": map[string]interface{}{
			"type":         "flight-offers-pricing",
			"flightOffers": offers,
		},
	}

	body, err := c.Post("/v1/shopping/flight-offers/pricing", reqBody)
	if err != nil {
		return nil, err
	}

	var resp models.FlightOffersResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}

// CreateFlightOrder creates a booking (PNR)
// API: POST /v1/booking/flight-orders
func (c *Client) CreateFlightOrder(req models.FlightOrderRequest) (*models.FlightOrderResponse, error) {
	body, err := c.Post("/v1/booking/flight-orders", req)
	if err != nil {
		return nil, err
	}

	var resp models.FlightOrderResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}

// GetFlightOrder retrieves an existing booking
// API: GET /v1/booking/flight-orders/{orderId}
func (c *Client) GetFlightOrder(orderID string) (*models.FlightOrderResponse, error) {
	path := fmt.Sprintf("/v1/booking/flight-orders/%s", orderID)
	body, err := c.Get(path)
	if err != nil {
		return nil, err
	}

	var resp models.FlightOrderResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}

// CancelFlightOrder cancels a booking
// API: DELETE /v1/booking/flight-orders/{orderId}
func (c *Client) CancelFlightOrder(orderID string) error {
	path := fmt.Sprintf("/v1/booking/flight-orders/%s", orderID)
	_, err := c.Delete(path)
	return err
}

// GetSeatmap retrieves seat map for a flight offer
// API: POST /v1/shopping/seatmaps
func (c *Client) GetSeatmap(offers []models.FlightOffer) (*models.SeatmapResponse, error) {
	reqBody := map[string]interface{}{
		"data": offers,
	}

	body, err := c.Post("/v1/shopping/seatmaps", reqBody)
	if err != nil {
		return nil, err
	}

	var resp models.SeatmapResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}

// GetFlightStatus checks real-time flight status
// API: GET /v2/schedule/flights
func (c *Client) GetFlightStatus(carrierCode, flightNumber, date string) (*models.FlightStatusResponse, error) {
	params := url.Values{}
	params.Set("carrierCode", carrierCode)
	params.Set("flightNumber", flightNumber)
	params.Set("scheduledDepartureDate", date)

	path := "/v2/schedule/flights?" + params.Encode()
	body, err := c.Get(path)
	if err != nil {
		return nil, err
	}

	var resp models.FlightStatusResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}

// GetFlightInspirations finds destinations by budget
// API: GET /v1/shopping/flight-destinations
func (c *Client) GetFlightInspirations(origin string, maxPrice int, currency string) ([]byte, error) {
	params := url.Values{}
	params.Set("origin", origin)
	if maxPrice > 0 {
		params.Set("maxPrice", strconv.Itoa(maxPrice))
	}
	if currency != "" {
		params.Set("currency", currency)
	}

	path := "/v1/shopping/flight-destinations?" + params.Encode()
	return c.Get(path)
}

// GetCheapestDates finds cheapest travel dates
// API: GET /v1/shopping/flight-dates
func (c *Client) GetCheapestDates(origin, destination string, oneWay bool) ([]byte, error) {
	params := url.Values{}
	params.Set("origin", origin)
	params.Set("destination", destination)
	if oneWay {
		params.Set("oneWay", "true")
	}

	path := "/v1/shopping/flight-dates?" + params.Encode()
	return c.Get(path)
}

// SearchLocations searches for airports and cities
// API: GET /v1/reference-data/locations
func (c *Client) SearchLocations(keyword string, subType string) ([]byte, error) {
	params := url.Values{}
	params.Set("keyword", keyword)
	params.Set("subType", subType) // AIRPORT, CITY, or AIRPORT,CITY

	path := "/v1/reference-data/locations?" + params.Encode()
	return c.Get(path)
}

// GetAirline looks up airline by code
// API: GET /v1/reference-data/airlines
func (c *Client) GetAirline(airlineCode string) ([]byte, error) {
	params := url.Values{}
	params.Set("airlineCodes", airlineCode)

	path := "/v1/reference-data/airlines?" + params.Encode()
	return c.Get(path)
}
