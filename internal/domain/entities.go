// Package domain contains enterprise business rules and entities
package domain

import (
	"time"
)

// FlightOffer represents a flight offer in our domain
type FlightOffer struct {
	ID                    string            `json:"id"`
	Source                string            `json:"source"`
	InstantTicketing      bool              `json:"instantTicketingRequired"`
	NonHomogeneous        bool              `json:"nonHomogeneous"`
	OneWay                bool              `json:"oneWay"`
	LastTicketingDate     string            `json:"lastTicketingDate,omitempty"`
	LastTicketingDateTime string            `json:"lastTicketingDateTime,omitempty"`
	NumberOfBookableSeats int               `json:"numberOfBookableSeats,omitempty"`
	Itineraries           []Itinerary       `json:"itineraries"`
	Price                 Price             `json:"price"`
	ValidatingAirlines    []string          `json:"validatingAirlineCodes"`
	TravelerPricings      []TravelerPricing `json:"travelerPricings"`

	// Computed fields for search/filter
	TotalPriceCents   int64     `json:"totalPriceCents"`
	TotalDurationMins int       `json:"totalDurationMins"`
	NumberOfStops     int       `json:"numberOfStops"`
	DepartureTime     time.Time `json:"departureTime"`
	ArrivalTime       time.Time `json:"arrivalTime"`
	MainCarrier       string    `json:"mainCarrier"`
}

// Itinerary represents one leg of the journey
type Itinerary struct {
	Duration string    `json:"duration,omitempty"`
	Segments []Segment `json:"segments"`
}

// Segment represents a single flight segment
type Segment struct {
	ID            string         `json:"id"`
	Departure     FlightEndpoint `json:"departure"`
	Arrival       FlightEndpoint `json:"arrival"`
	CarrierCode   string         `json:"carrierCode"`
	Number        string         `json:"number"`
	Aircraft      Aircraft       `json:"aircraft"`
	Operating     *Operating     `json:"operating,omitempty"`
	Duration      string         `json:"duration,omitempty"`
	NumberOfStops int            `json:"numberOfStops"`
}

// FlightEndpoint represents departure or arrival point
type FlightEndpoint struct {
	IataCode string `json:"iataCode"`
	Terminal string `json:"terminal,omitempty"`
	At       string `json:"at"`
}

// Aircraft information
type Aircraft struct {
	Code string `json:"code"`
}

// Operating carrier for codeshares
type Operating struct {
	CarrierCode string `json:"carrierCode"`
}

// Price breakdown
type Price struct {
	Currency   string `json:"currency"`
	Total      string `json:"total"`
	Base       string `json:"base"`
	GrandTotal string `json:"grandTotal"`
}

// TravelerPricing per traveler
type TravelerPricing struct {
	TravelerID           string                `json:"travelerId"`
	FareOption           string                `json:"fareOption"`
	TravelerType         string                `json:"travelerType"`
	Price                Price                 `json:"price"`
	FareDetailsBySegment []FareDetailBySegment `json:"fareDetailsBySegment"`
}

// FareDetailBySegment contains fare details
type FareDetailBySegment struct {
	SegmentID           string       `json:"segmentId"`
	Cabin               string       `json:"cabin"`
	FareBasis           string       `json:"fareBasis"`
	BrandedFare         string       `json:"brandedFare,omitempty"`
	Class               string       `json:"class"`
	IncludedCheckedBags *CheckedBags `json:"includedCheckedBags,omitempty"`
}

// CheckedBags allowance
type CheckedBags struct {
	Weight     int    `json:"weight,omitempty"`
	WeightUnit string `json:"weightUnit,omitempty"`
	Quantity   int    `json:"quantity,omitempty"`
}

// FlightSearchRequest represents search parameters
type FlightSearchRequest struct {
	Origin           string   `json:"origin" validate:"required,len=3"`
	Destination      string   `json:"destination" validate:"required,len=3"`
	DepartureDate    string   `json:"departureDate" validate:"required"`
	ReturnDate       string   `json:"returnDate,omitempty"`
	Adults           int      `json:"adults" validate:"required,min=1,max=9"`
	Children         int      `json:"children,omitempty"`
	Infants          int      `json:"infants,omitempty"`
	TravelClass      string   `json:"travelClass,omitempty"`
	NonStop          bool     `json:"nonStop,omitempty"`
	Currency         string   `json:"currency,omitempty"`
	MaxPrice         int      `json:"maxPrice,omitempty"`
	MaxResults       int      `json:"maxResults,omitempty"`
	IncludedAirlines []string `json:"includedAirlineCodes,omitempty"`
	ExcludedAirlines []string `json:"excludedAirlineCodes,omitempty"`
}

// CacheKey generates a unique key for caching
func (r *FlightSearchRequest) CacheKey() string {
	return r.Origin + "-" + r.Destination + "-" + r.DepartureDate + "-" + r.ReturnDate + "-" +
		string(rune(r.Adults)) + "-" + r.TravelClass + "-" + r.Currency
}

// FlightSearchResponse contains search results
type FlightSearchResponse struct {
	Data         []FlightOffer      `json:"data"`
	Dictionaries *Dictionaries      `json:"dictionaries,omitempty"`
	Meta         *SearchMeta        `json:"meta,omitempty"`
	CacheInfo    *CacheInfo         `json:"cacheInfo,omitempty"`
}

// Dictionaries contains reference data
type Dictionaries struct {
	Locations  map[string]Location `json:"locations,omitempty"`
	Aircraft   map[string]string   `json:"aircraft,omitempty"`
	Currencies map[string]string   `json:"currencies,omitempty"`
	Carriers   map[string]string   `json:"carriers,omitempty"`
}

// Location reference data
type Location struct {
	CityCode    string `json:"cityCode"`
	CountryCode string `json:"countryCode"`
}

// SearchMeta contains response metadata
type SearchMeta struct {
	Count     int    `json:"count"`
	RequestID string `json:"requestId,omitempty"`
}

// CacheInfo provides cache status information
type CacheInfo struct {
	FromCache bool      `json:"fromCache"`
	CachedAt  time.Time `json:"cachedAt,omitempty"`
	ExpiresAt time.Time `json:"expiresAt,omitempty"`
	TTL       int       `json:"ttlSeconds,omitempty"`
}

// Traveler represents a passenger
type Traveler struct {
	ID          string     `json:"id"`
	DateOfBirth string     `json:"dateOfBirth"`
	Name        Name       `json:"name"`
	Gender      string     `json:"gender,omitempty"`
	Contact     *Contact   `json:"contact,omitempty"`
	Documents   []Document `json:"documents,omitempty"`
}

// Name represents a person's name
type Name struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// Contact represents contact information
type Contact struct {
	Purpose      string  `json:"purpose,omitempty"`
	CompanyName  string  `json:"companyName,omitempty"`
	EmailAddress string  `json:"emailAddress,omitempty"`
	Phones       []Phone `json:"phones,omitempty"`
}

// Phone represents a phone number
type Phone struct {
	DeviceType         string `json:"deviceType,omitempty"`
	CountryCallingCode string `json:"countryCallingCode"`
	Number             string `json:"number"`
}

// Document represents a travel document
type Document struct {
	DocumentType    string `json:"documentType"`
	Number          string `json:"number"`
	ExpiryDate      string `json:"expiryDate"`
	IssuanceCountry string `json:"issuanceCountry"`
	Nationality     string `json:"nationality"`
	Holder          bool   `json:"holder"`
}

// FlightOrder represents a booking/PNR
type FlightOrder struct {
	ID                 string              `json:"id"`
	Type               string              `json:"type"`
	AssociatedRecords  []AssociatedRecord  `json:"associatedRecords,omitempty"`
	FlightOffers       []FlightOffer       `json:"flightOffers"`
	Travelers          []Traveler          `json:"travelers"`
	TicketingAgreement *TicketingAgreement `json:"ticketingAgreement,omitempty"`
}

// AssociatedRecord represents a PNR reference
type AssociatedRecord struct {
	Reference        string `json:"reference"`
	CreationDate     string `json:"creationDate"`
	OriginSystemCode string `json:"originSystemCode"`
}

// TicketingAgreement for order
type TicketingAgreement struct {
	Option   string `json:"option"`
	DateTime string `json:"dateTime,omitempty"`
}

// BookingRequest represents a booking request
type BookingRequest struct {
	FlightOffers []FlightOffer `json:"flightOffers"`
	Travelers    []Traveler    `json:"travelers"`
	Contacts     []Contact     `json:"contacts"`
}
