// Package models contains request and response types for the Flight IBE API
package models

// FlightSearchRequest represents a flight search query
type FlightSearchRequest struct {
	Origin               string   `json:"origin" binding:"required,len=3"`
	Destination          string   `json:"destination" binding:"required,len=3"`
	DepartureDate        string   `json:"departureDate" binding:"required"`
	ReturnDate           string   `json:"returnDate,omitempty"`
	Adults               int      `json:"adults" binding:"required,min=1,max=9"`
	Children             int      `json:"children,omitempty"`
	Infants              int      `json:"infants,omitempty"`
	TravelClass          string   `json:"travelClass,omitempty"` // ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
	NonStop              bool     `json:"nonStop,omitempty"`
	Currency             string   `json:"currency,omitempty"`
	MaxPrice             int      `json:"maxPrice,omitempty"`
	MaxResults           int      `json:"maxResults,omitempty"`
	IncludedAirlines     []string `json:"includedAirlineCodes,omitempty"`
	ExcludedAirlines     []string `json:"excludedAirlineCodes,omitempty"`
}

// FlightPriceRequest represents a pricing request for selected offers
type FlightPriceRequest struct {
	Data struct {
		Type         string        `json:"type"`
		FlightOffers []FlightOffer `json:"flightOffers"`
	} `json:"data"`
}

// FlightOrderRequest represents a booking request
type FlightOrderRequest struct {
	Data struct {
		Type         string        `json:"type"`
		FlightOffers []FlightOffer `json:"flightOffers"`
		Travelers    []Traveler    `json:"travelers"`
		Contacts     []Contact     `json:"contacts"`
		Remarks      *Remarks      `json:"remarks,omitempty"`
	} `json:"data"`
}

// Traveler represents a passenger
type Traveler struct {
	ID          string   `json:"id"`
	DateOfBirth string   `json:"dateOfBirth"`
	Name        Name     `json:"name"`
	Gender      string   `json:"gender,omitempty"` // MALE, FEMALE
	Contact     *Contact `json:"contact,omitempty"`
	Documents   []Document `json:"documents,omitempty"`
}

// Name represents a person's name
type Name struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// Contact represents contact information
type Contact struct {
	Purpose       string   `json:"purpose,omitempty"` // STANDARD, EMERGENCY
	CompanyName   string   `json:"companyName,omitempty"`
	EmailAddress  string   `json:"emailAddress,omitempty"`
	Phones        []Phone  `json:"phones,omitempty"`
}

// Phone represents a phone number
type Phone struct {
	DeviceType         string `json:"deviceType,omitempty"` // MOBILE, LANDLINE
	CountryCallingCode string `json:"countryCallingCode"`
	Number             string `json:"number"`
}

// Document represents a travel document (passport, etc.)
type Document struct {
	DocumentType     string `json:"documentType"` // PASSPORT, ID_CARD
	Number           string `json:"number"`
	ExpiryDate       string `json:"expiryDate"`
	IssuanceCountry  string `json:"issuanceCountry"`
	Nationality      string `json:"nationality"`
	Holder           bool   `json:"holder"`
}

// Remarks for the booking
type Remarks struct {
	General []GeneralRemark `json:"general,omitempty"`
}

// GeneralRemark is a text remark
type GeneralRemark struct {
	SubType string `json:"subType"` // GENERAL_MISCELLANEOUS
	Text    string `json:"text"`
}

// SeatmapRequest for retrieving seat maps
type SeatmapRequest struct {
	FlightOfferID string `json:"flightOfferId" binding:"required"`
}

// FlightStatusRequest for checking flight status
type FlightStatusRequest struct {
	CarrierCode  string `json:"carrierCode" binding:"required"`
	FlightNumber string `json:"flightNumber" binding:"required"`
	Date         string `json:"date" binding:"required"` // YYYY-MM-DD
}
