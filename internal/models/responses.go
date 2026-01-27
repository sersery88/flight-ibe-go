package models

// FlightOffersResponse from Amadeus Flight Offers Search API
type FlightOffersResponse struct {
	Meta         *Meta          `json:"meta,omitempty"`
	Data         []FlightOffer  `json:"data"`
	Dictionaries *Dictionaries  `json:"dictionaries,omitempty"`
}

// Meta contains response metadata
type Meta struct {
	Count int `json:"count"`
	Links *Links `json:"links,omitempty"`
}

// Links for pagination
type Links struct {
	Self string `json:"self,omitempty"`
}

// FlightOffer represents a single flight offer
type FlightOffer struct {
	Type                     string            `json:"type"`
	ID                       string            `json:"id"`
	Source                   string            `json:"source"`
	InstantTicketingRequired bool              `json:"instantTicketingRequired"`
	NonHomogeneous           bool              `json:"nonHomogeneous"`
	OneWay                   bool              `json:"oneWay"`
	IsUpsellOffer            bool              `json:"isUpsellOffer,omitempty"`
	LastTicketingDate        string            `json:"lastTicketingDate,omitempty"`
	LastTicketingDateTime    string            `json:"lastTicketingDateTime,omitempty"`
	NumberOfBookableSeats    int               `json:"numberOfBookableSeats,omitempty"`
	Itineraries              []Itinerary       `json:"itineraries"`
	Price                    Price             `json:"price"`
	PricingOptions           *PricingOptions   `json:"pricingOptions,omitempty"`
	ValidatingAirlineCodes   []string          `json:"validatingAirlineCodes"`
	TravelerPricings         []TravelerPricing `json:"travelerPricings"`
}

// Itinerary represents one leg of the journey (outbound or return)
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
	BlacklistedEU bool           `json:"blacklistedInEU,omitempty"`
	Co2Emissions  []Co2Emission  `json:"co2Emissions,omitempty"`
}

// FlightEndpoint represents departure or arrival point
type FlightEndpoint struct {
	IataCode string `json:"iataCode"`
	Terminal string `json:"terminal,omitempty"`
	At       string `json:"at"` // ISO 8601 datetime
}

// Aircraft information
type Aircraft struct {
	Code string `json:"code"`
}

// Operating carrier (for codeshares)
type Operating struct {
	CarrierCode string `json:"carrierCode"`
}

// Co2Emission data
type Co2Emission struct {
	Weight     int    `json:"weight"`
	WeightUnit string `json:"weightUnit"`
	Cabin      string `json:"cabin"`
}

// Price breakdown
type Price struct {
	Currency   string          `json:"currency"`
	Total      string          `json:"total"`
	Base       string          `json:"base"`
	GrandTotal string          `json:"grandTotal"`
	Fees       []Fee           `json:"fees,omitempty"`
	Taxes      []Tax           `json:"taxes,omitempty"`
}

// Fee in the price
type Fee struct {
	Amount string `json:"amount"`
	Type   string `json:"type"`
}

// Tax in the price
type Tax struct {
	Amount string `json:"amount"`
	Code   string `json:"code"`
}

// PricingOptions for the offer
type PricingOptions struct {
	FareType                []string `json:"fareType,omitempty"`
	IncludedCheckedBagsOnly bool     `json:"includedCheckedBagsOnly,omitempty"`
}

// TravelerPricing per traveler
type TravelerPricing struct {
	TravelerID           string                `json:"travelerId"`
	FareOption           string                `json:"fareOption"`
	TravelerType         string                `json:"travelerType"` // ADULT, CHILD, INFANT
	Price                Price                 `json:"price"`
	FareDetailsBySegment []FareDetailBySegment `json:"fareDetailsBySegment"`
}

// FareDetailBySegment contains fare details
type FareDetailBySegment struct {
	SegmentID           string       `json:"segmentId"`
	Cabin               string       `json:"cabin"`
	FareBasis           string       `json:"fareBasis"`
	BrandedFare         string       `json:"brandedFare,omitempty"`
	BrandedFareLabel    string       `json:"brandedFareLabel,omitempty"`
	Class               string       `json:"class"`
	IncludedCheckedBags *CheckedBags `json:"includedCheckedBags,omitempty"`
	Amenities           []Amenity    `json:"amenities,omitempty"`
}

// CheckedBags allowance
type CheckedBags struct {
	Weight     int    `json:"weight,omitempty"`
	WeightUnit string `json:"weightUnit,omitempty"`
	Quantity   int    `json:"quantity,omitempty"`
}

// Amenity included in fare
type Amenity struct {
	Description string `json:"description"`
	IsChargeable bool   `json:"isChargeable"`
	AmenityType  string `json:"amenityType"`
}

// Dictionaries contains reference data
type Dictionaries struct {
	Locations  map[string]Location  `json:"locations,omitempty"`
	Aircraft   map[string]string    `json:"aircraft,omitempty"`
	Currencies map[string]string    `json:"currencies,omitempty"`
	Carriers   map[string]string    `json:"carriers,omitempty"`
}

// Location reference data
type Location struct {
	CityCode    string `json:"cityCode"`
	CountryCode string `json:"countryCode"`
}

// FlightOrderResponse from Flight Create Orders API
type FlightOrderResponse struct {
	Data FlightOrder `json:"data"`
}

// FlightOrder (PNR)
type FlightOrder struct {
	Type                 string                `json:"type"`
	ID                   string                `json:"id"`
	AssociatedRecords    []AssociatedRecord    `json:"associatedRecords,omitempty"`
	FlightOffers         []FlightOffer         `json:"flightOffers"`
	Travelers            []TravelerInfo        `json:"travelers"`
	Contacts             []ContactInfo         `json:"contacts,omitempty"`
	TicketingAgreement   *TicketingAgreement   `json:"ticketingAgreement,omitempty"`
}

// AssociatedRecord (PNR reference)
type AssociatedRecord struct {
	Reference        string `json:"reference"`
	CreationDate     string `json:"creationDate"`
	OriginSystemCode string `json:"originSystemCode"`
}

// TravelerInfo in order
type TravelerInfo struct {
	ID          string    `json:"id"`
	DateOfBirth string    `json:"dateOfBirth"`
	Name        Name      `json:"name"`
	Gender      string    `json:"gender,omitempty"`
}

// ContactInfo in order
type ContactInfo struct {
	Purpose      string  `json:"purpose"`
	EmailAddress string  `json:"emailAddress,omitempty"`
	Phones       []Phone `json:"phones,omitempty"`
}

// TicketingAgreement
type TicketingAgreement struct {
	Option   string `json:"option"` // DELAY_TO_QUEUE, CONFIRM
	DateTime string `json:"dateTime,omitempty"`
}

// AmadeusError response
type AmadeusError struct {
	Errors []AmadeusErrorDetail `json:"errors"`
}

// AmadeusErrorDetail single error
type AmadeusErrorDetail struct {
	Status int    `json:"status"`
	Code   int    `json:"code"`
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Source *ErrorSource `json:"source,omitempty"`
}

// ErrorSource location of error
type ErrorSource struct {
	Pointer   string `json:"pointer,omitempty"`
	Parameter string `json:"parameter,omitempty"`
}

// SeatmapResponse from Seatmap Display API
type SeatmapResponse struct {
	Data []SeatmapData `json:"data"`
}

// SeatmapData for a flight
type SeatmapData struct {
	Type          string        `json:"type"`
	ID            string        `json:"id"`
	Departure     FlightEndpoint `json:"departure"`
	Arrival       FlightEndpoint `json:"arrival"`
	CarrierCode   string        `json:"carrierCode"`
	Number        string        `json:"number"`
	Aircraft      Aircraft      `json:"aircraft"`
	Decks         []Deck        `json:"decks"`
}

// Deck of the aircraft
type Deck struct {
	DeckType       string          `json:"deckType"`
	DeckConfiguration DeckConfig   `json:"deckConfiguration"`
	Facilities     []Facility      `json:"facilities,omitempty"`
	Seats          []Seat          `json:"seats"`
}

// DeckConfig layout
type DeckConfig struct {
	Width       int `json:"width"`
	Length      int `json:"length"`
	StartseatRow int `json:"startSeatRow"`
	EndSeatRow  int `json:"endSeatRow"`
	StartWingsX int `json:"startWingsX,omitempty"`
	EndWingsX   int `json:"endWingsX,omitempty"`
	StartWingsRow int `json:"startWingsRow,omitempty"`
	EndWingsRow int `json:"endWingsRow,omitempty"`
	ExitRowsX   []int `json:"exitRowsX,omitempty"`
}

// Facility on deck (lavatory, galley, etc.)
type Facility struct {
	Code       string `json:"code"`
	Column     string `json:"column"`
	Row        string `json:"row"`
	Position   string `json:"position"`
}

// Seat information
type Seat struct {
	Cabin             string   `json:"cabin"`
	Number            string   `json:"number"`
	CharacteristicsCodes []string `json:"characteristicsCodes,omitempty"`
	TravelerPricing   []SeatPricing `json:"travelerPricing,omitempty"`
}

// SeatPricing for seat selection
type SeatPricing struct {
	TravelerID string `json:"travelerId"`
	SeatAvailabilityStatus string `json:"seatAvailabilityStatus"`
	Price      *Price `json:"price,omitempty"`
}

// FlightStatusResponse from On-Demand Flight Status API
type FlightStatusResponse struct {
	Data []FlightStatus `json:"data"`
}

// FlightStatus information
type FlightStatus struct {
	Type          string          `json:"type"`
	ID            string          `json:"id"`
	CarrierCode   string          `json:"carrierCode"`
	Number        string          `json:"number"`
	ScheduledDepartureDate string `json:"scheduledDepartureDate"`
	FlightPoints  []FlightPoint   `json:"flightPoints"`
	Segments      []StatusSegment `json:"segments"`
}

// FlightPoint departure/arrival status
type FlightPoint struct {
	IataCode  string         `json:"iataCode"`
	Departure *PointTiming   `json:"departure,omitempty"`
	Arrival   *PointTiming   `json:"arrival,omitempty"`
}

// PointTiming with schedule and actual times
type PointTiming struct {
	Timings  []Timing `json:"timings"`
	Terminal *Terminal `json:"terminal,omitempty"`
	Gate     *Gate     `json:"gate,omitempty"`
}

// Timing scheduled vs actual
type Timing struct {
	Qualifier string `json:"qualifier"` // STD, ATD, STA, ATA
	Value     string `json:"value"`
}

// Terminal information
type Terminal struct {
	Code string `json:"code"`
}

// Gate information
type Gate struct {
	MainGate string `json:"mainGate"`
}

// StatusSegment for multi-leg flights
type StatusSegment struct {
	BoardPointIataCode string `json:"boardPointIataCode"`
	OffPointIataCode   string `json:"offPointIataCode"`
	ScheduledSegmentDuration string `json:"scheduledSegmentDuration"`
}
