// Package domain contains enterprise business rules and ports (interfaces)
package domain

import (
	"context"
)

// FlightSearcher defines the port for searching flights
type FlightSearcher interface {
	// SearchOffers searches for flight offers from external provider
	SearchOffers(ctx context.Context, req FlightSearchRequest) (*FlightSearchResponse, error)
	// PriceOffers gets updated pricing for selected offers
	PriceOffers(ctx context.Context, offers []FlightOffer) (*FlightSearchResponse, error)
}

// FlightBooker defines the port for booking flights
type FlightBooker interface {
	// CreateOrder creates a flight booking
	CreateOrder(ctx context.Context, req BookingRequest) (*FlightOrder, error)
	// GetOrder retrieves an existing booking
	GetOrder(ctx context.Context, orderID string) (*FlightOrder, error)
	// CancelOrder cancels a booking
	CancelOrder(ctx context.Context, orderID string) error
}

// FlightCache defines the port for caching flight offers
type FlightCache interface {
	// Get retrieves cached offers for a search request
	Get(ctx context.Context, key string) (*FlightSearchResponse, bool)
	// Set stores offers in cache with TTL
	Set(ctx context.Context, key string, response *FlightSearchResponse) error
	// Delete removes cached entry
	Delete(ctx context.Context, key string) error
	// Clear removes all cached entries
	Clear(ctx context.Context) error
}

// FlightIndexer defines the port for indexing flight offers in a search engine
type FlightIndexer interface {
	// Index stores flight offers in the search index
	Index(ctx context.Context, searchKey string, offers []FlightOffer) error
	// Search retrieves and filters indexed offers
	Search(ctx context.Context, query FlightIndexQuery) ([]FlightOffer, error)
	// Delete removes offers from the index
	Delete(ctx context.Context, searchKey string) error
}

// FlightIndexQuery defines search/filter parameters for indexed offers
type FlightIndexQuery struct {
	SearchKey         string   `json:"searchKey"`
	MinPrice          int64    `json:"minPrice,omitempty"`
	MaxPrice          int64    `json:"maxPrice,omitempty"`
	Airlines          []string `json:"airlines,omitempty"`
	MaxStops          *int     `json:"maxStops,omitempty"`
	MinDepartureTime  string   `json:"minDepartureTime,omitempty"`
	MaxDepartureTime  string   `json:"maxDepartureTime,omitempty"`
	SortBy            string   `json:"sortBy,omitempty"`   // price, duration, departure
	SortOrder         string   `json:"sortOrder,omitempty"` // asc, desc
	Limit             int      `json:"limit,omitempty"`
	Offset            int      `json:"offset,omitempty"`
}

// LocationSearcher defines the port for location/airport search
type LocationSearcher interface {
	// SearchLocations finds airports and cities by keyword
	SearchLocations(ctx context.Context, keyword, subType string) ([]LocationResult, error)
}

// LocationResult represents a location search result
type LocationResult struct {
	Type        string `json:"type"`
	SubType     string `json:"subType"`
	Name        string `json:"name"`
	IataCode    string `json:"iataCode"`
	CityCode    string `json:"cityCode,omitempty"`
	CountryCode string `json:"countryCode"`
	Address     struct {
		CityName    string `json:"cityName"`
		CountryName string `json:"countryName"`
	} `json:"address"`
}

// SeatmapProvider defines the port for retrieving seatmaps
type SeatmapProvider interface {
	// GetSeatmap retrieves the seatmap for flight offers
	GetSeatmap(ctx context.Context, offers []FlightOffer) ([]SeatmapData, error)
}

// SeatmapData contains seatmap information
type SeatmapData struct {
	ID          string         `json:"id"`
	Departure   FlightEndpoint `json:"departure"`
	Arrival     FlightEndpoint `json:"arrival"`
	CarrierCode string         `json:"carrierCode"`
	Number      string         `json:"number"`
	Aircraft    Aircraft       `json:"aircraft"`
	Decks       []Deck         `json:"decks"`
}

// Deck represents an aircraft deck
type Deck struct {
	DeckType string `json:"deckType"`
	Seats    []Seat `json:"seats"`
}

// Seat represents a seat
type Seat struct {
	Number              string   `json:"number"`
	Cabin               string   `json:"cabin"`
	Characteristics     []string `json:"characteristicsCodes,omitempty"`
	AvailabilityStatus  string   `json:"seatAvailabilityStatus,omitempty"`
}

// FlightStatusProvider defines the port for flight status
type FlightStatusProvider interface {
	// GetStatus retrieves real-time flight status
	GetStatus(ctx context.Context, carrierCode, flightNumber, date string) (*FlightStatus, error)
}

// FlightStatus contains flight status information
type FlightStatus struct {
	ID                     string        `json:"id"`
	CarrierCode            string        `json:"carrierCode"`
	FlightNumber           string        `json:"number"`
	ScheduledDepartureDate string        `json:"scheduledDepartureDate"`
	Status                 string        `json:"status"`
	FlightPoints           []FlightPoint `json:"flightPoints"`
}

// FlightPoint represents departure/arrival status
type FlightPoint struct {
	IataCode  string         `json:"iataCode"`
	Departure *PointTiming   `json:"departure,omitempty"`
	Arrival   *PointTiming   `json:"arrival,omitempty"`
}

// PointTiming contains scheduled and actual times
type PointTiming struct {
	Scheduled string `json:"scheduled,omitempty"`
	Actual    string `json:"actual,omitempty"`
	Terminal  string `json:"terminal,omitempty"`
	Gate      string `json:"gate,omitempty"`
}

// Metrics defines the port for application metrics
type Metrics interface {
	// IncrementSearchRequests increments the search request counter
	IncrementSearchRequests(source string, cached bool)
	// ObserveSearchLatency records search latency
	ObserveSearchLatency(source string, durationMs float64)
	// IncrementCacheHits increments cache hit counter
	IncrementCacheHits()
	// IncrementCacheMisses increments cache miss counter
	IncrementCacheMisses()
	// SetCacheSize sets the current cache size gauge
	SetCacheSize(size int)
	// IncrementAPIErrors increments API error counter
	IncrementAPIErrors(operation, errorType string)
	// ObserveAPILatency records external API latency
	ObserveAPILatency(provider, operation string, durationMs float64)
}

// RequestCoalescer handles coalescing of identical concurrent requests
type RequestCoalescer interface {
	// Do executes the function for the given key, coalescing duplicate calls
	Do(ctx context.Context, key string, fn func() (interface{}, error)) (interface{}, error)
}

// HealthChecker defines the port for health checks
type HealthChecker interface {
	// Check performs a health check
	Check(ctx context.Context) HealthStatus
	// Name returns the name of this health check
	Name() string
}

// HealthStatus represents the health status of a component
type HealthStatus struct {
	Status  string            `json:"status"` // healthy, degraded, unhealthy
	Message string            `json:"message,omitempty"`
	Details map[string]string `json:"details,omitempty"`
}
