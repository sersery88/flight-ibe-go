// Package amadeus provides the Amadeus API adapter
package amadeus

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/sersery88/flight-ibe-go/internal/domain"
)

const (
	TestBaseURL       = "https://test.api.amadeus.com"
	ProductionBaseURL = "https://api.amadeus.com"
)

// Adapter implements domain ports using the Amadeus API
type Adapter struct {
	httpClient   *http.Client
	baseURL      string
	clientID     string
	clientSecret string
	logger       *slog.Logger

	// Token cache
	tokenMu     sync.RWMutex
	accessToken string
	tokenExpiry time.Time
}

// Config for the Amadeus adapter
type Config struct {
	ClientID     string
	ClientSecret string
	Environment  string // "test" or "production"
	Timeout      time.Duration
	Logger       *slog.Logger
}

// NewAdapter creates a new Amadeus adapter
func NewAdapter(config Config) (*Adapter, error) {
	if config.ClientID == "" || config.ClientSecret == "" {
		return nil, fmt.Errorf("client ID and secret are required")
	}

	baseURL := TestBaseURL
	if config.Environment == "production" {
		baseURL = ProductionBaseURL
	}

	timeout := config.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	return &Adapter{
		httpClient: &http.Client{
			Timeout: timeout,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		baseURL:      baseURL,
		clientID:     config.ClientID,
		clientSecret: config.ClientSecret,
		logger:       config.Logger,
	}, nil
}

// IsProduction returns true if using production environment
func (a *Adapter) IsProduction() bool {
	return a.baseURL == ProductionBaseURL
}

// getToken returns a valid access token, refreshing if necessary
func (a *Adapter) getToken(ctx context.Context) (string, error) {
	a.tokenMu.RLock()
	if a.accessToken != "" && time.Now().Add(60*time.Second).Before(a.tokenExpiry) {
		token := a.accessToken
		a.tokenMu.RUnlock()
		return token, nil
	}
	a.tokenMu.RUnlock()

	return a.refreshToken(ctx)
}

// refreshToken fetches a new access token
func (a *Adapter) refreshToken(ctx context.Context) (string, error) {
	a.tokenMu.Lock()
	defer a.tokenMu.Unlock()

	// Double-check after acquiring write lock
	if a.accessToken != "" && time.Now().Add(60*time.Second).Before(a.tokenExpiry) {
		return a.accessToken, nil
	}

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", a.clientID)
	data.Set("client_secret", a.clientSecret)

	req, err := http.NewRequestWithContext(ctx, "POST", a.baseURL+"/v1/security/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("failed to parse token response: %w", err)
	}

	a.accessToken = tokenResp.AccessToken
	a.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-120) * time.Second)

	return a.accessToken, nil
}

// doRequest performs an authenticated HTTP request
func (a *Adapter) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	token, err := a.getToken(ctx)
	if err != nil {
		return nil, err
	}

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, a.baseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// SearchOffers implements domain.FlightSearcher
func (a *Adapter) SearchOffers(ctx context.Context, req domain.FlightSearchRequest) (*domain.FlightSearchResponse, error) {
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
	body, err := a.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}

	var resp domain.FlightSearchResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Compute derived fields for each offer
	for i := range resp.Data {
		enrichFlightOffer(&resp.Data[i])
	}

	return &resp, nil
}

// PriceOffers implements domain.FlightSearcher
func (a *Adapter) PriceOffers(ctx context.Context, offers []domain.FlightOffer) (*domain.FlightSearchResponse, error) {
	reqBody := map[string]interface{}{
		"data": map[string]interface{}{
			"type":         "flight-offers-pricing",
			"flightOffers": offers,
		},
	}

	body, err := a.doRequest(ctx, "POST", "/v1/shopping/flight-offers/pricing", reqBody)
	if err != nil {
		return nil, err
	}

	var resp domain.FlightSearchResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}

// CreateOrder implements domain.FlightBooker
func (a *Adapter) CreateOrder(ctx context.Context, req domain.BookingRequest) (*domain.FlightOrder, error) {
	reqBody := map[string]interface{}{
		"data": map[string]interface{}{
			"type":         "flight-order",
			"flightOffers": req.FlightOffers,
			"travelers":    req.Travelers,
			"contacts":     req.Contacts,
		},
	}

	body, err := a.doRequest(ctx, "POST", "/v1/booking/flight-orders", reqBody)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Data domain.FlightOrder `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp.Data, nil
}

// GetOrder implements domain.FlightBooker
func (a *Adapter) GetOrder(ctx context.Context, orderID string) (*domain.FlightOrder, error) {
	path := fmt.Sprintf("/v1/booking/flight-orders/%s", orderID)
	body, err := a.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Data domain.FlightOrder `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp.Data, nil
}

// CancelOrder implements domain.FlightBooker
func (a *Adapter) CancelOrder(ctx context.Context, orderID string) error {
	path := fmt.Sprintf("/v1/booking/flight-orders/%s", orderID)
	_, err := a.doRequest(ctx, "DELETE", path, nil)
	return err
}

// SearchLocations implements domain.LocationSearcher
func (a *Adapter) SearchLocations(ctx context.Context, keyword, subType string) ([]domain.LocationResult, error) {
	params := url.Values{}
	params.Set("keyword", keyword)
	params.Set("subType", subType)

	path := "/v1/reference-data/locations?" + params.Encode()
	body, err := a.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Data []domain.LocationResult `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return resp.Data, nil
}

// enrichFlightOffer computes derived fields for search/filter
func enrichFlightOffer(offer *domain.FlightOffer) {
	// Parse total price
	if offer.Price.Total != "" {
		if price, err := strconv.ParseFloat(offer.Price.Total, 64); err == nil {
			offer.TotalPriceCents = int64(price * 100)
		}
	}

	// Compute total duration and stops
	totalDuration := 0
	totalStops := 0
	for _, itinerary := range offer.Itineraries {
		totalStops += len(itinerary.Segments) - 1
		
		// Parse duration (ISO 8601 format like "PT2H30M")
		if itinerary.Duration != "" {
			totalDuration += parseDuration(itinerary.Duration)
		}
	}
	offer.TotalDurationMins = totalDuration
	offer.NumberOfStops = totalStops

	// Get departure and arrival times
	if len(offer.Itineraries) > 0 && len(offer.Itineraries[0].Segments) > 0 {
		firstSegment := offer.Itineraries[0].Segments[0]
		if t, err := time.Parse(time.RFC3339, firstSegment.Departure.At); err == nil {
			offer.DepartureTime = t
		}
		
		lastItinerary := offer.Itineraries[0]
		lastSegment := lastItinerary.Segments[len(lastItinerary.Segments)-1]
		if t, err := time.Parse(time.RFC3339, lastSegment.Arrival.At); err == nil {
			offer.ArrivalTime = t
		}
		
		offer.MainCarrier = firstSegment.CarrierCode
	}
}

// parseDuration parses ISO 8601 duration (e.g., "PT2H30M") to minutes
func parseDuration(d string) int {
	if len(d) < 2 || d[0] != 'P' {
		return 0
	}
	
	d = d[1:] // Remove 'P'
	if len(d) > 0 && d[0] == 'T' {
		d = d[1:] // Remove 'T'
	}
	
	minutes := 0
	current := 0
	
	for _, c := range d {
		switch {
		case c >= '0' && c <= '9':
			current = current*10 + int(c-'0')
		case c == 'H':
			minutes += current * 60
			current = 0
		case c == 'M':
			minutes += current
			current = 0
		}
	}
	
	return minutes
}
