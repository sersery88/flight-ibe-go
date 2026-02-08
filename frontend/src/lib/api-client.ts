/**
 * API Client for Flight IBE Go Backend
 * Next.js compatible (uses process.env instead of import.meta.env)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface ApiError {
  message: string;
  code?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error: ApiError = {
        message: `API Error: ${response.statusText}`,
        status: response.status,
      };

      try {
        const errorData = await response.json();
        error.message = errorData.message || errorData.error || error.message;
        error.code = errorData.code;
      } catch {
        // Ignore JSON parse errors
      }

      throw error;
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// ============================================================================
// API Endpoints (Go Backend: /api/flights/*)
// ============================================================================

import type {
  FlightSearchRequest,
  FlightOffersResponse,
  FlightOffer,
  FlightPriceResponse,
  SeatmapData,
  FlightDatesResponse,
} from '@/types/flight';

// Flight Search
// Go: POST /api/flights/search
export async function searchFlights(request: FlightSearchRequest): Promise<FlightOffersResponse> {
  return apiClient.post<FlightOffersResponse>('/flights/search', request);
}

// Flight Price
// Go: POST /api/flights/price
export async function priceFlightOffers(
  offers: FlightOffer[],
  includeBags = true
): Promise<FlightPriceResponse> {
  return apiClient.post('/flights/price', {
    flightOffers: offers,
    includeBags: includeBags,
  });
}

// Price Matrix
export interface PriceMatrixRequest {
  origin: string;
  destination: string;
  outboundDates: string[];
  inboundDates: string[];
  adults: number;
  children?: number;
  infants?: number;
  currency?: string;
}

export interface PriceMatrixEntry {
  outboundDate: string;
  inboundDate: string;
  price: string | null;
  currency: string;
}

export interface PriceMatrixResponse {
  prices: PriceMatrixEntry[];
}

export async function getPriceMatrix(request: PriceMatrixRequest): Promise<PriceMatrixResponse> {
  // Note: Price matrix not implemented in Go backend yet
  // For now, return empty response
  console.warn('Price matrix not yet implemented in Go backend');
  return { prices: [] };
}

// Location Search (for airport autocomplete)
// Go: GET /api/locations?keyword=
export interface LocationResult {
  iataCode: string;
  name: string;
  cityCode?: string;
  countryCode?: string;
  subType: 'AIRPORT' | 'CITY';
}

interface BackendLocation {
  iataCode?: string;
  name?: string;
  detailedName?: string;
  subtype?: string | null;
  type?: string;
  address?: {
    cityCode?: string;
    cityName?: string;
    countryCode?: string;
    countryName?: string;
  };
}

export async function searchLocations(keyword: string): Promise<{ data: LocationResult[] }> {
  const response = await apiClient.get<{ data: BackendLocation[] }>('/locations', { keyword });

  // Transform backend response to frontend format
  const transformed: LocationResult[] = response.data
    .filter((loc): loc is BackendLocation & { iataCode: string } => !!loc.iataCode)
    .map((loc) => ({
      iataCode: loc.iataCode,
      name: loc.name || loc.detailedName || loc.iataCode,
      cityCode: loc.address?.cityCode,
      countryCode: loc.address?.countryCode,
      subType: (loc.type === 'location' && loc.name?.toUpperCase() === loc.address?.cityName?.toUpperCase() ? 'CITY' : 'AIRPORT') as 'AIRPORT' | 'CITY',
    }));

  return { data: transformed };
}

// Seatmaps
// Go: POST /api/flights/seatmap
export async function getSeatmaps(offers: FlightOffer[]): Promise<{ data: SeatmapData[] }> {
  return apiClient.post('/flights/seatmap', { flightOffers: offers });
}

// Create Booking
// Go: POST /api/flights/book
export interface BookingRequest {
  flightOffers: FlightOffer[];
  travelers: unknown[];
  contact?: unknown;
  payment?: unknown;
}

export interface BookingResponse {
  id: string;
  associatedRecords: Array<{ reference: string }>;
}

export async function createBooking(request: BookingRequest): Promise<{ data: BookingResponse }> {
  return apiClient.post('/flights/book', {
    data: {
      type: 'flight-order',
      flightOffers: request.flightOffers,
      travelers: request.travelers,
      contacts: request.contact ? [request.contact] : [],
    }
  });
}

// Get Booking
// Go: GET /api/flights/orders/:id
export async function getBooking(orderId: string): Promise<{ data: BookingResponse }> {
  return apiClient.get(`/flights/orders/${orderId}`);
}

// Cancel Booking
// Go: DELETE /api/flights/orders/:id
export async function cancelBooking(orderId: string): Promise<void> {
  return apiClient.delete(`/flights/orders/${orderId}`);
}

// Get Branded Fares / Upsell Options
// Go: POST /api/flights/upsell
export async function getUpsellOffers(offers: FlightOffer[]): Promise<FlightOffersResponse> {
  return apiClient.post<FlightOffersResponse>('/flights/upsell', { flightOffers: offers });
}

// Flight Cheapest Date Search
// Go: GET /api/flights/inspirations (different endpoint)
export async function getFlightDates(
  origin: string,
  destination: string
): Promise<FlightDatesResponse> {
  // Note: cheapest dates not implemented, using inspirations endpoint
  console.warn('Cheapest dates using inspirations endpoint');
  return apiClient.get<FlightDatesResponse>('/flights/inspirations', { origin });
}

// Flight Status
// Go: GET /api/flights/status
export async function getFlightStatus(
  carrierCode: string,
  flightNumber: string,
  date: string
): Promise<unknown> {
  return apiClient.get('/flights/status', { carrierCode, flightNumber, date });
}

// ============================================================================
// Stub Types
// ============================================================================

export interface FlightDestination {
  destination: string;
  departureDate?: string;
  returnDate?: string;
  price?: {
    total: string;
    currency?: string;
  };
}
