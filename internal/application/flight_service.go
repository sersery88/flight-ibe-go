// Package application contains application-level use cases
package application

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/sersery88/flight-ibe-go/internal/domain"
)

// FlightService implements flight search and booking use cases
type FlightService struct {
	searcher   domain.FlightSearcher
	booker     domain.FlightBooker
	cache      domain.FlightCache
	indexer    domain.FlightIndexer
	coalescer  domain.RequestCoalescer
	metrics    domain.Metrics
	logger     *slog.Logger
	
	cacheTTL   time.Duration
}

// FlightServiceConfig contains configuration for FlightService
type FlightServiceConfig struct {
	CacheTTL time.Duration
}

// NewFlightService creates a new FlightService
func NewFlightService(
	searcher domain.FlightSearcher,
	booker domain.FlightBooker,
	cache domain.FlightCache,
	indexer domain.FlightIndexer,
	coalescer domain.RequestCoalescer,
	metrics domain.Metrics,
	logger *slog.Logger,
	config FlightServiceConfig,
) *FlightService {
	if config.CacheTTL == 0 {
		config.CacheTTL = 15 * time.Minute // Default 15 min TTL for flight offers
	}
	
	return &FlightService{
		searcher:  searcher,
		booker:    booker,
		cache:     cache,
		indexer:   indexer,
		coalescer: coalescer,
		metrics:   metrics,
		logger:    logger,
		cacheTTL:  config.CacheTTL,
	}
}

// SearchFlights searches for flights with caching and request coalescing
func (s *FlightService) SearchFlights(ctx context.Context, req domain.FlightSearchRequest) (*domain.FlightSearchResponse, error) {
	startTime := time.Now()
	cacheKey := req.CacheKey()
	
	s.logger.InfoContext(ctx, "searching flights",
		slog.String("origin", req.Origin),
		slog.String("destination", req.Destination),
		slog.String("departureDate", req.DepartureDate),
		slog.String("cacheKey", cacheKey),
	)
	
	// Check cache first
	if cached, ok := s.cache.Get(ctx, cacheKey); ok {
		s.logger.InfoContext(ctx, "cache hit",
			slog.String("cacheKey", cacheKey),
			slog.Int("resultCount", len(cached.Data)),
		)
		s.metrics.IncrementCacheHits()
		s.metrics.IncrementSearchRequests("cache", true)
		s.metrics.ObserveSearchLatency("cache", float64(time.Since(startTime).Milliseconds()))
		
		cached.CacheInfo = &domain.CacheInfo{
			FromCache: true,
			CachedAt:  cached.CacheInfo.CachedAt,
			ExpiresAt: cached.CacheInfo.ExpiresAt,
			TTL:       int(time.Until(cached.CacheInfo.ExpiresAt).Seconds()),
		}
		return cached, nil
	}
	
	s.metrics.IncrementCacheMisses()
	
	// Use request coalescing to prevent duplicate API calls
	result, err := s.coalescer.Do(ctx, cacheKey, func() (interface{}, error) {
		return s.fetchAndCacheFlights(ctx, req, cacheKey)
	})
	
	if err != nil {
		s.metrics.IncrementAPIErrors("search", categorizeError(err))
		return nil, err
	}
	
	response := result.(*domain.FlightSearchResponse)
	s.metrics.IncrementSearchRequests("api", false)
	s.metrics.ObserveSearchLatency("api", float64(time.Since(startTime).Milliseconds()))
	
	return response, nil
}

// fetchAndCacheFlights fetches from API and caches the result
func (s *FlightService) fetchAndCacheFlights(ctx context.Context, req domain.FlightSearchRequest, cacheKey string) (*domain.FlightSearchResponse, error) {
	apiStart := time.Now()
	
	response, err := s.searcher.SearchOffers(ctx, req)
	if err != nil {
		s.logger.ErrorContext(ctx, "API search failed",
			slog.String("cacheKey", cacheKey),
			slog.String("error", err.Error()),
		)
		return nil, fmt.Errorf("flight search failed: %w", err)
	}
	
	s.metrics.ObserveAPILatency("amadeus", "search", float64(time.Since(apiStart).Milliseconds()))
	
	s.logger.InfoContext(ctx, "API search completed",
		slog.String("cacheKey", cacheKey),
		slog.Int("resultCount", len(response.Data)),
		slog.Duration("latency", time.Since(apiStart)),
	)
	
	// Add cache info
	now := time.Now()
	response.CacheInfo = &domain.CacheInfo{
		FromCache: false,
		CachedAt:  now,
		ExpiresAt: now.Add(s.cacheTTL),
		TTL:       int(s.cacheTTL.Seconds()),
	}
	
	// Cache the response
	if err := s.cache.Set(ctx, cacheKey, response); err != nil {
		s.logger.WarnContext(ctx, "failed to cache response",
			slog.String("cacheKey", cacheKey),
			slog.String("error", err.Error()),
		)
	}
	
	// Index offers for fast filtering (async)
	if s.indexer != nil && len(response.Data) > 0 {
		go func() {
			indexCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			
			if err := s.indexer.Index(indexCtx, cacheKey, response.Data); err != nil {
				s.logger.Warn("failed to index offers",
					slog.String("cacheKey", cacheKey),
					slog.String("error", err.Error()),
				)
			}
		}()
	}
	
	return response, nil
}

// FilterFlights applies filters to cached flight results
func (s *FlightService) FilterFlights(ctx context.Context, query domain.FlightIndexQuery) ([]domain.FlightOffer, error) {
	s.logger.InfoContext(ctx, "filtering flights",
		slog.String("searchKey", query.SearchKey),
		slog.Int64("maxPrice", query.MaxPrice),
		slog.String("sortBy", query.SortBy),
	)
	
	if s.indexer == nil {
		return nil, fmt.Errorf("flight indexer not available")
	}
	
	return s.indexer.Search(ctx, query)
}

// PriceFlights gets updated pricing for selected offers
func (s *FlightService) PriceFlights(ctx context.Context, offers []domain.FlightOffer) (*domain.FlightSearchResponse, error) {
	startTime := time.Now()
	
	s.logger.InfoContext(ctx, "pricing flights",
		slog.Int("offerCount", len(offers)),
	)
	
	response, err := s.searcher.PriceOffers(ctx, offers)
	if err != nil {
		s.metrics.IncrementAPIErrors("pricing", categorizeError(err))
		return nil, fmt.Errorf("flight pricing failed: %w", err)
	}
	
	s.metrics.ObserveAPILatency("amadeus", "pricing", float64(time.Since(startTime).Milliseconds()))
	
	return response, nil
}

// CreateBooking creates a flight booking
func (s *FlightService) CreateBooking(ctx context.Context, req domain.BookingRequest) (*domain.FlightOrder, error) {
	startTime := time.Now()
	
	s.logger.InfoContext(ctx, "creating booking",
		slog.Int("offerCount", len(req.FlightOffers)),
		slog.Int("travelerCount", len(req.Travelers)),
	)
	
	order, err := s.booker.CreateOrder(ctx, req)
	if err != nil {
		s.metrics.IncrementAPIErrors("booking", categorizeError(err))
		return nil, fmt.Errorf("booking failed: %w", err)
	}
	
	s.metrics.ObserveAPILatency("amadeus", "booking", float64(time.Since(startTime).Milliseconds()))
	
	s.logger.InfoContext(ctx, "booking created",
		slog.String("orderID", order.ID),
	)
	
	return order, nil
}

// GetBooking retrieves an existing booking
func (s *FlightService) GetBooking(ctx context.Context, orderID string) (*domain.FlightOrder, error) {
	s.logger.InfoContext(ctx, "retrieving booking",
		slog.String("orderID", orderID),
	)
	
	return s.booker.GetOrder(ctx, orderID)
}

// CancelBooking cancels a booking
func (s *FlightService) CancelBooking(ctx context.Context, orderID string) error {
	s.logger.InfoContext(ctx, "cancelling booking",
		slog.String("orderID", orderID),
	)
	
	if err := s.booker.CancelOrder(ctx, orderID); err != nil {
		s.metrics.IncrementAPIErrors("cancel", categorizeError(err))
		return fmt.Errorf("cancellation failed: %w", err)
	}
	
	return nil
}

// categorizeError categorizes an error for metrics
func categorizeError(err error) string {
	if err == nil {
		return "none"
	}
	
	// Check for common error types
	errStr := err.Error()
	switch {
	case contains(errStr, "timeout"):
		return "timeout"
	case contains(errStr, "rate limit"):
		return "rate_limit"
	case contains(errStr, "unauthorized"):
		return "auth"
	case contains(errStr, "not found"):
		return "not_found"
	case contains(errStr, "invalid"):
		return "validation"
	default:
		return "unknown"
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsRune(s, substr))
}

func containsRune(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
