// Package opensearch provides OpenSearch integration for flight offer indexing
package opensearch

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"

	opensearch "github.com/opensearch-project/opensearch-go/v2"
	opensearchapi "github.com/opensearch-project/opensearch-go/v2/opensearchapi"

	"github.com/sersery88/flight-ibe-go/internal/domain"
)

const (
	flightOffersIndex = "flight-offers"
)

// Indexer implements domain.FlightIndexer using OpenSearch
type Indexer struct {
	client *opensearch.Client
	logger *slog.Logger
}

// Config for OpenSearch indexer
type Config struct {
	Addresses []string
	Username  string
	Password  string
	Logger    *slog.Logger
}

// NewIndexer creates a new OpenSearch indexer
func NewIndexer(config Config) (*Indexer, error) {
	if len(config.Addresses) == 0 {
		config.Addresses = []string{"http://localhost:9200"}
	}

	client, err := opensearch.NewClient(opensearch.Config{
		Addresses: config.Addresses,
		Username:  config.Username,
		Password:  config.Password,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenSearch client: %w", err)
	}

	indexer := &Indexer{
		client: client,
		logger: config.Logger,
	}

	// Create index if it doesn't exist
	if err := indexer.ensureIndex(context.Background()); err != nil {
		return nil, err
	}

	return indexer, nil
}

// ensureIndex creates the flight offers index with proper mappings
func (i *Indexer) ensureIndex(ctx context.Context) error {
	// Check if index exists
	res, err := i.client.Indices.Exists([]string{flightOffersIndex})
	if err != nil {
		return fmt.Errorf("failed to check index existence: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode == 200 {
		return nil // Index exists
	}

	// Create index with mappings
	mapping := `{
		"settings": {
			"number_of_shards": 1,
			"number_of_replicas": 0,
			"refresh_interval": "1s"
		},
		"mappings": {
			"properties": {
				"searchKey": {"type": "keyword"},
				"offerID": {"type": "keyword"},
				"totalPriceCents": {"type": "long"},
				"totalDurationMins": {"type": "integer"},
				"numberOfStops": {"type": "integer"},
				"departureTime": {"type": "date"},
				"arrivalTime": {"type": "date"},
				"mainCarrier": {"type": "keyword"},
				"airlines": {"type": "keyword"},
				"origin": {"type": "keyword"},
				"destination": {"type": "keyword"},
				"cabin": {"type": "keyword"},
				"indexedAt": {"type": "date"},
				"offer": {"type": "object", "enabled": false}
			}
		}
	}`

	req := opensearchapi.IndicesCreateRequest{
		Index: flightOffersIndex,
		Body:  strings.NewReader(mapping),
	}

	res, err = req.Do(ctx, i.client)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("failed to create index: %s", res.String())
	}

	if i.logger != nil {
		i.logger.Info("created flight offers index")
	}

	return nil
}

// IndexedOffer represents an offer in the search index
type IndexedOffer struct {
	SearchKey         string            `json:"searchKey"`
	OfferID           string            `json:"offerID"`
	TotalPriceCents   int64             `json:"totalPriceCents"`
	TotalDurationMins int               `json:"totalDurationMins"`
	NumberOfStops     int               `json:"numberOfStops"`
	DepartureTime     time.Time         `json:"departureTime"`
	ArrivalTime       time.Time         `json:"arrivalTime"`
	MainCarrier       string            `json:"mainCarrier"`
	Airlines          []string          `json:"airlines"`
	Origin            string            `json:"origin"`
	Destination       string            `json:"destination"`
	Cabin             string            `json:"cabin"`
	IndexedAt         time.Time         `json:"indexedAt"`
	Offer             domain.FlightOffer `json:"offer"`
}

// Index stores flight offers in the search index
func (i *Indexer) Index(ctx context.Context, searchKey string, offers []domain.FlightOffer) error {
	if len(offers) == 0 {
		return nil
	}

	var buf bytes.Buffer
	now := time.Now()

	for _, offer := range offers {
		// Extract airlines from all segments
		airlinesMap := make(map[string]bool)
		var origin, destination, cabin string

		for _, itinerary := range offer.Itineraries {
			for _, segment := range itinerary.Segments {
				airlinesMap[segment.CarrierCode] = true
				if segment.Operating != nil {
					airlinesMap[segment.Operating.CarrierCode] = true
				}
			}
			if len(itinerary.Segments) > 0 {
				if origin == "" {
					origin = itinerary.Segments[0].Departure.IataCode
				}
				destination = itinerary.Segments[len(itinerary.Segments)-1].Arrival.IataCode
			}
		}

		// Get cabin from first traveler pricing
		if len(offer.TravelerPricings) > 0 && len(offer.TravelerPricings[0].FareDetailsBySegment) > 0 {
			cabin = offer.TravelerPricings[0].FareDetailsBySegment[0].Cabin
		}

		airlines := make([]string, 0, len(airlinesMap))
		for airline := range airlinesMap {
			airlines = append(airlines, airline)
		}

		indexed := IndexedOffer{
			SearchKey:         searchKey,
			OfferID:           offer.ID,
			TotalPriceCents:   offer.TotalPriceCents,
			TotalDurationMins: offer.TotalDurationMins,
			NumberOfStops:     offer.NumberOfStops,
			DepartureTime:     offer.DepartureTime,
			ArrivalTime:       offer.ArrivalTime,
			MainCarrier:       offer.MainCarrier,
			Airlines:          airlines,
			Origin:            origin,
			Destination:       destination,
			Cabin:             cabin,
			IndexedAt:         now,
			Offer:             offer,
		}

		// Bulk index action
		meta := map[string]interface{}{
			"index": map[string]interface{}{
				"_index": flightOffersIndex,
				"_id":    searchKey + "-" + offer.ID,
			},
		}

		metaBytes, _ := json.Marshal(meta)
		docBytes, _ := json.Marshal(indexed)

		buf.Write(metaBytes)
		buf.WriteByte('\n')
		buf.Write(docBytes)
		buf.WriteByte('\n')
	}

	req := opensearchapi.BulkRequest{
		Body:    &buf,
		Refresh: "true",
	}

	res, err := req.Do(ctx, i.client)
	if err != nil {
		return fmt.Errorf("bulk index failed: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("bulk index error: %s", res.String())
	}

	if i.logger != nil {
		i.logger.Debug("indexed offers",
			slog.String("searchKey", searchKey),
			slog.Int("count", len(offers)),
		)
	}

	return nil
}

// Search retrieves and filters indexed offers
func (i *Indexer) Search(ctx context.Context, query domain.FlightIndexQuery) ([]domain.FlightOffer, error) {
	// Build query
	must := []map[string]interface{}{
		{"term": map[string]interface{}{"searchKey": query.SearchKey}},
	}

	// Price filter
	if query.MinPrice > 0 || query.MaxPrice > 0 {
		priceRange := map[string]interface{}{}
		if query.MinPrice > 0 {
			priceRange["gte"] = query.MinPrice
		}
		if query.MaxPrice > 0 {
			priceRange["lte"] = query.MaxPrice
		}
		must = append(must, map[string]interface{}{
			"range": map[string]interface{}{"totalPriceCents": priceRange},
		})
	}

	// Stops filter
	if query.MaxStops != nil {
		must = append(must, map[string]interface{}{
			"range": map[string]interface{}{
				"numberOfStops": map[string]interface{}{"lte": *query.MaxStops},
			},
		})
	}

	// Airlines filter
	if len(query.Airlines) > 0 {
		must = append(must, map[string]interface{}{
			"terms": map[string]interface{}{"airlines": query.Airlines},
		})
	}

	// Build sort
	var sortList []map[string]interface{}
	if query.SortBy != "" {
		order := "asc"
		if query.SortOrder == "desc" {
			order = "desc"
		}

		sortField := query.SortBy
		switch sortField {
		case "price":
			sortField = "totalPriceCents"
		case "duration":
			sortField = "totalDurationMins"
		case "departure":
			sortField = "departureTime"
		}

		sortList = append(sortList, map[string]interface{}{
			sortField: map[string]interface{}{"order": order},
		})
	} else {
		// Default sort by price
		sortList = append(sortList, map[string]interface{}{
			"totalPriceCents": map[string]interface{}{"order": "asc"},
		})
	}

	// Build search body
	searchBody := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must": must,
			},
		},
		"sort": sortList,
		"size": func() int {
			if query.Limit > 0 {
				return query.Limit
			}
			return 100
		}(),
		"from": query.Offset,
	}

	bodyBytes, _ := json.Marshal(searchBody)

	req := opensearchapi.SearchRequest{
		Index: []string{flightOffersIndex},
		Body:  bytes.NewReader(bodyBytes),
	}

	res, err := req.Do(ctx, i.client)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("search error: %s", res.String())
	}

	// Parse response
	var searchResult struct {
		Hits struct {
			Hits []struct {
				Source IndexedOffer `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}

	if err := json.NewDecoder(res.Body).Decode(&searchResult); err != nil {
		return nil, fmt.Errorf("failed to parse search response: %w", err)
	}

	// Extract offers
	offers := make([]domain.FlightOffer, len(searchResult.Hits.Hits))
	for i, hit := range searchResult.Hits.Hits {
		offers[i] = hit.Source.Offer
	}

	return offers, nil
}

// Delete removes offers from the index
func (i *Indexer) Delete(ctx context.Context, searchKey string) error {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"term": map[string]interface{}{
				"searchKey": searchKey,
			},
		},
	}

	bodyBytes, _ := json.Marshal(query)

	req := opensearchapi.DeleteByQueryRequest{
		Index: []string{flightOffersIndex},
		Body:  bytes.NewReader(bodyBytes),
	}

	res, err := req.Do(ctx, i.client)
	if err != nil {
		return fmt.Errorf("delete failed: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("delete error: %s", res.String())
	}

	return nil
}

// InMemoryIndexer provides a simple in-memory implementation for development
type InMemoryIndexer struct {
	offers map[string][]domain.FlightOffer
	logger *slog.Logger
}

// NewInMemoryIndexer creates a new in-memory indexer
func NewInMemoryIndexer(logger *slog.Logger) *InMemoryIndexer {
	return &InMemoryIndexer{
		offers: make(map[string][]domain.FlightOffer),
		logger: logger,
	}
}

// Index stores offers in memory
func (i *InMemoryIndexer) Index(ctx context.Context, searchKey string, offers []domain.FlightOffer) error {
	i.offers[searchKey] = offers
	return nil
}

// Search filters offers in memory
func (i *InMemoryIndexer) Search(ctx context.Context, query domain.FlightIndexQuery) ([]domain.FlightOffer, error) {
	offers, ok := i.offers[query.SearchKey]
	if !ok {
		return nil, nil
	}

	// Apply filters
	var filtered []domain.FlightOffer
	for _, offer := range offers {
		// Price filter
		if query.MinPrice > 0 && offer.TotalPriceCents < query.MinPrice {
			continue
		}
		if query.MaxPrice > 0 && offer.TotalPriceCents > query.MaxPrice {
			continue
		}

		// Stops filter
		if query.MaxStops != nil && offer.NumberOfStops > *query.MaxStops {
			continue
		}

		// Airlines filter
		if len(query.Airlines) > 0 {
			found := false
			for _, airline := range query.Airlines {
				if offer.MainCarrier == airline {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		filtered = append(filtered, offer)
	}

	// Sort
	switch query.SortBy {
	case "price":
		sort.Slice(filtered, func(i, j int) bool {
			if query.SortOrder == "desc" {
				return filtered[i].TotalPriceCents > filtered[j].TotalPriceCents
			}
			return filtered[i].TotalPriceCents < filtered[j].TotalPriceCents
		})
	case "duration":
		sort.Slice(filtered, func(i, j int) bool {
			if query.SortOrder == "desc" {
				return filtered[i].TotalDurationMins > filtered[j].TotalDurationMins
			}
			return filtered[i].TotalDurationMins < filtered[j].TotalDurationMins
		})
	case "departure":
		sort.Slice(filtered, func(i, j int) bool {
			if query.SortOrder == "desc" {
				return filtered[i].DepartureTime.After(filtered[j].DepartureTime)
			}
			return filtered[i].DepartureTime.Before(filtered[j].DepartureTime)
		})
	default:
		// Default sort by price
		sort.Slice(filtered, func(i, j int) bool {
			return filtered[i].TotalPriceCents < filtered[j].TotalPriceCents
		})
	}

	// Apply limit and offset
	if query.Offset > 0 && query.Offset < len(filtered) {
		filtered = filtered[query.Offset:]
	}
	if query.Limit > 0 && query.Limit < len(filtered) {
		filtered = filtered[:query.Limit]
	}

	return filtered, nil
}

// Delete removes offers from memory
func (i *InMemoryIndexer) Delete(ctx context.Context, searchKey string) error {
	delete(i.offers, searchKey)
	return nil
}
