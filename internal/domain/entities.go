// Package domain contains enterprise business rules and entities
package domain

import (
	"time"
)

// FlightOffer represents a flight offer in our domain
type FlightOffer struct {
	Type                  string            `json:"type,omitempty"`
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

// ---- Seatmap Domain Models ----

// SeatmapResponse is the top-level response from the Amadeus SeatMap API
type SeatmapResponse struct {
	Data         []SeatmapData        `json:"data"`
	Dictionaries *SeatmapDictionaries `json:"dictionaries,omitempty"`
}

// SeatmapDictionaries contains lookup tables for facility and seat characteristic codes
type SeatmapDictionaries struct {
	Facility map[string]string `json:"facility,omitempty"`
	Seat     map[string]string `json:"seatCharacteristic,omitempty"`
}

// SeatmapData contains seatmap information for a single flight segment
type SeatmapData struct {
	Type                   string                  `json:"type"`
	ID                     string                  `json:"id"`
	FlightOfferID          string                  `json:"flightOfferId,omitempty"`
	SegmentID              string                  `json:"segmentId,omitempty"`
	Departure              FlightEndpoint          `json:"departure"`
	Arrival                FlightEndpoint          `json:"arrival"`
	CarrierCode            string                  `json:"carrierCode"`
	Number                 string                  `json:"number"`
	Operating              *OperatingFlight        `json:"operating,omitempty"`
	Aircraft               Aircraft                `json:"aircraft"`
	Class                  string                  `json:"class,omitempty"`
	Decks                  []Deck                  `json:"decks"`
	AircraftCabinAmenities *AircraftCabinAmenities `json:"aircraftCabinAmenities,omitempty"`
	AvailableSeatsCounters []AvailableSeatsCounter `json:"availableSeatsCounters,omitempty"`
}

// OperatingFlight represents the operating carrier (for codeshares)
type OperatingFlight struct {
	CarrierCode string `json:"carrierCode"`
}

// Deck represents an aircraft deck (MAIN, UPPER, LOWER)
type Deck struct {
	DeckType          string            `json:"deckType"`
	DeckConfiguration DeckConfiguration `json:"deckConfiguration"`
	Facilities        []Facility        `json:"facilities,omitempty"`
	Seats             []Seat            `json:"seats"`
}

// DeckConfiguration describes the physical dimensions and layout of a deck
type DeckConfiguration struct {
	Width         int   `json:"width"`
	Length        int   `json:"length"`
	StartSeatRow  int   `json:"startSeatRow"`
	EndSeatRow    int   `json:"endSeatRow"`
	StartWingsX   int   `json:"startWingsX,omitempty"`
	EndWingsX     int   `json:"endWingsX,omitempty"`
	StartWingsRow int   `json:"startWingsRow,omitempty"`
	EndWingsRow   int   `json:"endWingsRow,omitempty"`
	ExitRowsX     []int `json:"exitRowsX,omitempty"`
}

// Facility represents an on-board facility (lavatory, galley, closet, stairs, bar, etc.)
type Facility struct {
	Code        string      `json:"code"`
	Column      string      `json:"column,omitempty"`
	Row         string      `json:"row,omitempty"`
	Position    string      `json:"position,omitempty"`
	Coordinates Coordinates `json:"coordinates"`
}

// Seat represents a single seat with pricing and characteristics
type Seat struct {
	Cabin                string                `json:"cabin"`
	Number               string                `json:"number"`
	CharacteristicsCodes []string              `json:"characteristicsCodes,omitempty"`
	TravelerPricing      []SeatTravelerPricing `json:"travelerPricing,omitempty"`
	Coordinates          Coordinates           `json:"coordinates"`
}

// Coordinates represents grid coordinates for seats and facilities
type Coordinates struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// SeatTravelerPricing contains availability and price for a specific traveler
type SeatTravelerPricing struct {
	TravelerID             string `json:"travelerId"`
	SeatAvailabilityStatus string `json:"seatAvailabilityStatus"`
	Price                  *Price `json:"price,omitempty"`
}

// AircraftCabinAmenities describes amenities available in the cabin
type AircraftCabinAmenities struct {
	Power         *AmenityPower          `json:"power,omitempty"`
	Seat          *AmenitySeat           `json:"seat,omitempty"`
	Wifi          *AmenityWifi           `json:"wifi,omitempty"`
	Entertainment []AmenityEntertainment `json:"entertainment,omitempty"`
	Food          *AmenityFood           `json:"food,omitempty"`
	Beverage      *AmenityBeverage       `json:"beverage,omitempty"`
}

// AmenityPower describes power outlet availability
type AmenityPower struct {
	IsChargeable bool   `json:"isChargeable,omitempty"`
	PowerType    string `json:"powerType,omitempty"`
	USBType      string `json:"usbType,omitempty"`
}

// AmenitySeat describes seat physical characteristics
type AmenitySeat struct {
	LegSpace  int    `json:"legSpace,omitempty"`
	SpaceUnit string `json:"spaceUnit,omitempty"`
	Tilt      string `json:"tilt,omitempty"`
}

// AmenityWifi describes wifi availability
type AmenityWifi struct {
	IsChargeable bool   `json:"isChargeable,omitempty"`
	WifiCoverage string `json:"wifiCoverage,omitempty"`
}

// AmenityEntertainment describes entertainment options
type AmenityEntertainment struct {
	IsChargeable      bool   `json:"isChargeable,omitempty"`
	EntertainmentType string `json:"entertainmentType,omitempty"`
}

// AmenityFood describes food service
type AmenityFood struct {
	IsChargeable bool   `json:"isChargeable,omitempty"`
	FoodType     string `json:"foodType,omitempty"`
}

// AmenityBeverage describes beverage service
type AmenityBeverage struct {
	IsChargeable  bool   `json:"isChargeable,omitempty"`
	BeverageType  string `json:"beverageType,omitempty"`
}

// AvailableSeatsCounter counts available seats per traveler
type AvailableSeatsCounter struct {
	TravelerID string `json:"travelerId"`
	Value      int    `json:"value"`
}
