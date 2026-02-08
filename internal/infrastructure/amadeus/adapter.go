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

// GetUpsellOffers implements domain.UpsellProvider
func (a *Adapter) GetUpsellOffers(ctx context.Context, offers []domain.FlightOffer) (*domain.FlightSearchResponse, error) {
	// Amadeus requires "type": "flight-offer" on each offer
	for i := range offers {
		offers[i].Type = "flight-offer"
	}
	reqBody := map[string]interface{}{
		"data": map[string]interface{}{
			"type":         "flight-offers-upselling",
			"flightOffers": offers,
		},
	}

	body, err := a.doRequest(ctx, "POST", "/v1/shopping/flight-offers/upselling", reqBody)
	if err != nil {
		return nil, err
	}

	var resp domain.FlightSearchResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse upsell response: %w", err)
	}

	// Enrich offers with derived fields
	for i := range resp.Data {
		enrichFlightOffer(&resp.Data[i])
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

// GetSeatmap implements domain.SeatmapProvider
func (a *Adapter) GetSeatmap(ctx context.Context, offers []domain.FlightOffer) (*domain.SeatmapResponse, error) {
	// Amadeus requires "type": "flight-offer" on each offer
	for i := range offers {
		offers[i].Type = "flight-offer"
	}

	reqBody := map[string]interface{}{
		"data": offers,
	}

	body, err := a.doRequest(ctx, "POST", "/v1/shopping/seatmaps", reqBody)
	if err != nil {
		return nil, fmt.Errorf("seatmap request failed: %w", err)
	}

	var resp domain.SeatmapResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse seatmap response: %w", err)
	}

	return &resp, nil
}

// PriceOffersWithAncillaries implements domain.FlightSearcher (pricing with ancillary data)
func (a *Adapter) PriceOffersWithAncillaries(ctx context.Context, offers []domain.FlightOffer, include []string) (*domain.PricingResponse, error) {
	a.logger.InfoContext(ctx, "pricing offers with ancillaries",
		slog.Int("offerCount", len(offers)),
		slog.Any("include", include),
	)

	// Set type on offers
	for i := range offers {
		offers[i].Type = "flight-offer"
	}

	reqBody := map[string]interface{}{
		"data": map[string]interface{}{
			"type":         "flight-offers-pricing",
			"flightOffers": offers,
		},
	}

	// Build query string with include parameters
	path := "/v1/shopping/flight-offers/pricing"
	if len(include) > 0 {
		path += "?include=" + strings.Join(include, ",")
	}

	body, err := a.doRequest(ctx, "POST", path, reqBody)
	if err != nil {
		a.logger.ErrorContext(ctx, "pricing with ancillaries failed",
			slog.String("error", err.Error()),
		)
		return nil, fmt.Errorf("pricing with ancillaries failed: %w", err)
	}

	a.logger.DebugContext(ctx, "pricing response received",
		slog.Int("responseSize", len(body)),
	)

	// Parse the raw response
	var rawResp struct {
		Data struct {
			Type         string                    `json:"type"`
			FlightOffers []domain.FlightOffer      `json:"flightOffers"`
		} `json:"data"`
		Included *json.RawMessage `json:"included,omitempty"`
		Dictionaries *json.RawMessage `json:"dictionaries,omitempty"`
	}
	if err := json.Unmarshal(body, &rawResp); err != nil {
		return nil, fmt.Errorf("failed to parse pricing response: %w", err)
	}

	result := &domain.PricingResponse{
		FlightOffers: rawResp.Data.FlightOffers,
	}

	// Parse bag options from travelerPricings[].fareDetailsBySegment[].amenities / additionalServices
	result.BagOptions = a.parseBagOptions(body)
	result.ServiceOptions = a.parseServiceOptions(body)
	result.FareRules = a.parseFareRules(body)
	result.CreditCardFees = a.parseCreditCardFees(body)

	a.logger.InfoContext(ctx, "pricing with ancillaries completed",
		slog.Int("offers", len(result.FlightOffers)),
		slog.Int("bagOptions", len(result.BagOptions)),
		slog.Int("serviceOptions", len(result.ServiceOptions)),
		slog.Int("fareRules", len(result.FareRules)),
		slog.Int("creditCardFees", len(result.CreditCardFees)),
	)

	return result, nil
}

// parseBagOptions extracts bag options from the pricing response
func (a *Adapter) parseBagOptions(body []byte) []domain.BagOption {
	var bags []domain.BagOption

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return bags
	}

	// Try to parse included bags from the response
	// Amadeus returns bags under included.bags or within travelerPricings
	var parsed struct {
		Data struct {
			FlightOffers []struct {
				TravelerPricings []struct {
					TravelerID           string `json:"travelerId"`
					FareDetailsBySegment []struct {
						SegmentID string `json:"segmentId"`
						Amenities []struct {
							Description   string `json:"description"`
							IsChargeable  bool   `json:"isChargeable"`
							AmenityType   string `json:"amenityType"`
							AmenityProvider struct {
								Name string `json:"name"`
							} `json:"amenityProvider"`
						} `json:"amenities"`
						AdditionalServices *struct {
							ChargeableCheckedBags *struct {
								Weight     int    `json:"weight"`
								WeightUnit string `json:"weightUnit"`
								Quantity   int    `json:"quantity"`
							} `json:"chargeableCheckedBags"`
						} `json:"additionalServices"`
					} `json:"fareDetailsBySegment"`
				} `json:"travelerPricings"`
			} `json:"flightOffers"`
		} `json:"data"`
		Included *struct {
			DetailedFareRules json.RawMessage `json:"detailed-fare-rules,omitempty"`
			Bags              []struct {
				TravelerIDs []string `json:"travelerIds"`
				SegmentIDs  []string `json:"segmentIds"`
				Name        string   `json:"name"`
				Quantity    int      `json:"quantity"`
				Weight      int      `json:"weight"`
				WeightUnit  string   `json:"weightUnit"`
				Price       struct {
					Amount   string `json:"amount"`
					Currency string `json:"currency"`
				} `json:"price"`
				BookableByTraveler bool   `json:"bookableByTraveler"`
				Type               string `json:"type"`
			} `json:"bags,omitempty"`
		} `json:"included,omitempty"`
	}

	if err := json.Unmarshal(body, &parsed); err != nil {
		a.logger.Debug("failed to parse bags from response", slog.String("error", err.Error()))
		return bags
	}

	// Parse from included.bags if available
	if parsed.Included != nil {
		for _, bag := range parsed.Included.Bags {
			price := 0.0
			if bag.Price.Amount != "" {
				fmt.Sscanf(bag.Price.Amount, "%f", &price)
			}
			for _, tid := range bag.TravelerIDs {
				for _, sid := range bag.SegmentIDs {
					bags = append(bags, domain.BagOption{
						TravelerID: tid,
						SegmentID:  sid,
						Weight:     bag.Weight,
						WeightUnit: bag.WeightUnit,
						Quantity:   bag.Quantity,
						Price:      price,
						Currency:   bag.Price.Currency,
						Type:       bag.Type,
					})
				}
			}
		}
	}

	// Also parse from travelerPricings additionalServices
	for _, offer := range parsed.Data.FlightOffers {
		for _, tp := range offer.TravelerPricings {
			for _, fd := range tp.FareDetailsBySegment {
				if fd.AdditionalServices != nil && fd.AdditionalServices.ChargeableCheckedBags != nil {
					cb := fd.AdditionalServices.ChargeableCheckedBags
					bags = append(bags, domain.BagOption{
						TravelerID: tp.TravelerID,
						SegmentID:  fd.SegmentID,
						Weight:     cb.Weight,
						WeightUnit: cb.WeightUnit,
						Quantity:   cb.Quantity,
						Type:       "CHECKED_BAG",
					})
				}
			}
		}
	}

	return bags
}

// parseServiceOptions extracts service options from the pricing response
func (a *Adapter) parseServiceOptions(body []byte) []domain.ServiceOption {
	var services []domain.ServiceOption

	var parsed struct {
		Included *struct {
			OtherServices []struct {
				Type  string `json:"type"`
				Price struct {
					Amount   string `json:"amount"`
					Currency string `json:"currency"`
				} `json:"price"`
			} `json:"other-services,omitempty"`
		} `json:"included,omitempty"`
	}

	if err := json.Unmarshal(body, &parsed); err != nil {
		return services
	}

	if parsed.Included != nil {
		for _, svc := range parsed.Included.OtherServices {
			price := 0.0
			if svc.Price.Amount != "" {
				fmt.Sscanf(svc.Price.Amount, "%f", &price)
			}
			services = append(services, domain.ServiceOption{
				Type:     svc.Type,
				Price:    price,
				Currency: svc.Price.Currency,
			})
		}
	}

	return services
}

// parseFareRules extracts fare rules from the pricing response
func (a *Adapter) parseFareRules(body []byte) []domain.FareRuleGroup {
	var fareRules []domain.FareRuleGroup

	var parsed struct {
		Included *struct {
			DetailedFareRules []struct {
				FareNotes []struct {
					SegmentID string `json:"segmentId,omitempty"`
					Rules     []struct {
						Category   string `json:"category"`
						NotApplicable bool `json:"notApplicable,omitempty"`
						MaxPenaltyAmount string `json:"maxPenaltyAmount,omitempty"`
						Currency         string `json:"currency,omitempty"`
						Descriptions     []struct {
							Text string `json:"text"`
						} `json:"descriptions,omitempty"`
					} `json:"rules,omitempty"`
				} `json:"fareNotes,omitempty"`
			} `json:"detailed-fare-rules,omitempty"`
		} `json:"included,omitempty"`
	}

	if err := json.Unmarshal(body, &parsed); err != nil {
		return fareRules
	}

	if parsed.Included == nil {
		return fareRules
	}

	for _, dfr := range parsed.Included.DetailedFareRules {
		for _, fn := range dfr.FareNotes {
			group := domain.FareRuleGroup{
				SegmentID: fn.SegmentID,
			}
			for _, r := range fn.Rules {
				penalty := 0.0
				if r.MaxPenaltyAmount != "" {
					fmt.Sscanf(r.MaxPenaltyAmount, "%f", &penalty)
				}
				desc := ""
				for _, d := range r.Descriptions {
					if desc != "" {
						desc += "; "
					}
					desc += d.Text
				}
				group.Rules = append(group.Rules, domain.FareRule{
					Category:      r.Category,
					NotApplicable: r.NotApplicable,
					MaxPenalty:    penalty,
					Currency:      r.Currency,
					Description:   desc,
				})
			}
			if len(group.Rules) > 0 {
				fareRules = append(fareRules, group)
			}
		}
	}

	return fareRules
}

// parseCreditCardFees extracts credit card fees from the pricing response
func (a *Adapter) parseCreditCardFees(body []byte) []domain.CreditCardFee {
	var fees []domain.CreditCardFee

	var parsed struct {
		Included *struct {
			CreditCardFees []struct {
				Brand string `json:"brand"`
				Amount string `json:"amount"`
				Currency string `json:"currency"`
			} `json:"credit-card-fees,omitempty"`
		} `json:"included,omitempty"`
	}

	if err := json.Unmarshal(body, &parsed); err != nil {
		return fees
	}

	if parsed.Included != nil {
		for _, fee := range parsed.Included.CreditCardFees {
			amount := 0.0
			if fee.Amount != "" {
				fmt.Sscanf(fee.Amount, "%f", &amount)
			}
			fees = append(fees, domain.CreditCardFee{
				Brand:    fee.Brand,
				Amount:   amount,
				Currency: fee.Currency,
			})
		}
	}

	return fees
}

// CreateBookingOrder implements domain.FlightBooker — creates a PNR with traveler data
func (a *Adapter) CreateBookingOrder(ctx context.Context, req domain.CreateOrderRequest) (*domain.CreateOrderResponse, error) {
	a.logger.InfoContext(ctx, "creating booking order (PNR)",
		slog.Int("travelerCount", len(req.Travelers)),
		slog.String("offerId", req.Offer.ID),
	)

	// Build Amadeus travelers from our TravelerData
	travelers := make([]map[string]interface{}, len(req.Travelers))
	for i, t := range req.Travelers {
		traveler := map[string]interface{}{
			"id":          t.ID,
			"dateOfBirth": t.DateOfBirth,
			"gender":      t.Gender,
			"name": map[string]string{
				"firstName": strings.ToUpper(t.FirstName),
				"lastName":  strings.ToUpper(t.LastName),
			},
			"documents": []map[string]interface{}{
				{
					"nationality":  t.Nationality,
					"documentType": "IDENTITY_CARD",
				},
			},
		}

		// Add contact info only to the first traveler
		if i == 0 {
			contact := map[string]interface{}{
				"emailAddress": req.Contact.Email,
				"phones": []map[string]interface{}{
					{
						"number":              req.Contact.Phone,
						"countryCallingCode":   req.Contact.PhoneCountryCode,
						"deviceType":           "MOBILE",
					},
				},
			}
			traveler["contact"] = contact
		}

		// Add FQTV / loyalty program if present
		if t.FQTV != nil && t.FQTV.ProgramOwner != "" && t.FQTV.MemberID != "" {
			traveler["loyaltyPrograms"] = []map[string]string{
				{
					"programOwner": t.FQTV.ProgramOwner,
					"id":           t.FQTV.MemberID,
				},
			}
		}

		travelers[i] = traveler
	}

	// Ticketing agreement: DELAY_TO_QUEUE with 6h time limit
	ticketingDateTime := time.Now().UTC().Add(6 * time.Hour).Format("2006-01-02T15:04:05")

	// Set offer type
	req.Offer.Type = "flight-offer"

	reqBody := map[string]interface{}{
		"data": map[string]interface{}{
			"type":         "flight-order",
			"flightOffers": []domain.FlightOffer{req.Offer},
			"travelers":    travelers,
			"ticketingAgreement": map[string]interface{}{
				"option":   "DELAY_TO_QUEUE",
				"dateTime": ticketingDateTime,
			},
		},
	}

	a.logger.DebugContext(ctx, "sending create order request",
		slog.String("ticketingDateTime", ticketingDateTime),
	)

	body, err := a.doRequest(ctx, "POST", "/v1/booking/flight-orders", reqBody)
	if err != nil {
		a.logger.ErrorContext(ctx, "create booking order failed",
			slog.String("error", err.Error()),
		)
		return nil, fmt.Errorf("create booking order failed: %w", err)
	}

	a.logger.DebugContext(ctx, "create order response received",
		slog.Int("responseSize", len(body)),
	)

	// Parse response to extract orderId and PNR
	var resp struct {
		Data struct {
			ID                string `json:"id"`
			Type              string `json:"type"`
			AssociatedRecords []struct {
				Reference        string `json:"reference"`
				CreationDate     string `json:"creationDate"`
				OriginSystemCode string `json:"originSystemCode"`
			} `json:"associatedRecords"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse create order response: %w", err)
	}

	pnrRef := ""
	if len(resp.Data.AssociatedRecords) > 0 {
		pnrRef = resp.Data.AssociatedRecords[0].Reference
	}

	a.logger.InfoContext(ctx, "booking order created",
		slog.String("orderId", resp.Data.ID),
		slog.String("pnr", pnrRef),
	)

	return &domain.CreateOrderResponse{
		OrderID:      resp.Data.ID,
		PNRReference: pnrRef,
		AmadeusData:  json.RawMessage(body),
	}, nil
}

// GetBookingOrder implements domain.FlightBooker — retrieves a booking order with raw data
func (a *Adapter) GetBookingOrder(ctx context.Context, orderID string) (*domain.CreateOrderResponse, error) {
	a.logger.InfoContext(ctx, "getting booking order",
		slog.String("orderId", orderID),
	)

	path := fmt.Sprintf("/v1/booking/flight-orders/%s", orderID)
	body, err := a.doRequest(ctx, "GET", path, nil)
	if err != nil {
		a.logger.ErrorContext(ctx, "get booking order failed",
			slog.String("orderId", orderID),
			slog.String("error", err.Error()),
		)
		return nil, fmt.Errorf("get booking order failed: %w", err)
	}

	var resp struct {
		Data struct {
			ID                string `json:"id"`
			AssociatedRecords []struct {
				Reference string `json:"reference"`
			} `json:"associatedRecords"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse get order response: %w", err)
	}

	pnrRef := ""
	if len(resp.Data.AssociatedRecords) > 0 {
		pnrRef = resp.Data.AssociatedRecords[0].Reference
	}

	a.logger.InfoContext(ctx, "booking order retrieved",
		slog.String("orderId", resp.Data.ID),
		slog.String("pnr", pnrRef),
	)

	return &domain.CreateOrderResponse{
		OrderID:      resp.Data.ID,
		PNRReference: pnrRef,
		AmadeusData:  json.RawMessage(body),
	}, nil
}

// GetSeatmapByOrder implements domain.SeatmapProvider — seatmap via order ID
func (a *Adapter) GetSeatmapByOrder(ctx context.Context, orderID string) (*domain.SeatmapResponse, error) {
	a.logger.InfoContext(ctx, "fetching seatmap by order",
		slog.String("orderId", orderID),
	)

	path := fmt.Sprintf("/v1/shopping/seatmaps?flight-orderId=%s", url.QueryEscape(orderID))
	body, err := a.doRequest(ctx, "GET", path, nil)
	if err != nil {
		a.logger.ErrorContext(ctx, "seatmap by order request failed",
			slog.String("orderId", orderID),
			slog.String("error", err.Error()),
		)
		return nil, fmt.Errorf("seatmap by order request failed: %w", err)
	}

	var resp domain.SeatmapResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse seatmap response: %w", err)
	}

	a.logger.InfoContext(ctx, "seatmap by order retrieved",
		slog.String("orderId", orderID),
		slog.Int("seatmapCount", len(resp.Data)),
	)

	return &resp, nil
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
