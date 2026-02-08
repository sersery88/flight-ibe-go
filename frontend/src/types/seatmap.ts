/**
 * Seatmap Types — Dedicated types for the seatmap feature.
 *
 * Re-exports relevant base types from @/types/flight and adds seatmap-specific
 * computed/UI types (GridLayout, CabinBoundary, SelectedSeat, etc.).
 *
 * Components in src/components/seatmap/ should import from here.
 */

// Re-export all seatmap-relevant types from the canonical flight types
export type {
  SeatmapResponse,
  SeatmapData,
  Deck,
  DeckType,
  DeckConfiguration,
  Facility,
  Seat,
  SeatCoordinates,
  SeatTravelerPricing,
  SeatAvailabilityStatus,
  SeatPrice,
  AvailableSeatsCounter,
  AircraftCabinAmenities,
  CabinAmenity,
  WifiAmenity,
  EntertainmentAmenity,
  FoodAmenity,
  BeverageAmenity,
  SeatAmenity,
  SeatTilt,
  PowerType,
  UsbType,
  WifiCoverage,
  EntertainmentType,
  FoodType,
  BeverageType,
  MediaType,
  Media,
  QualifiedFreeText,
  FlightEndpoint,
  Aircraft,
  OperatingFlight,
  Dictionaries,
  FlightOffer,
  TravelerType,
} from '@/types/flight';

// ============================================================================
// Seat Status (UI state, superset of API status)
// ============================================================================

/**
 * Extended seat status for the UI — adds SELECTED on top of the Amadeus API
 * statuses (AVAILABLE, BLOCKED, OCCUPIED).
 */
export type SeatStatus = 'AVAILABLE' | 'BLOCKED' | 'OCCUPIED' | 'SELECTED';

// ============================================================================
// Cabin Code
// ============================================================================

/** Amadeus cabin codes used in Seat.cabin */
export type CabinCode = 'F' | 'C' | 'W' | 'M';

export const CABIN_LABELS: Record<CabinCode, string> = {
  F: 'First Class',
  C: 'Business Class',
  W: 'Premium Economy',
  M: 'Economy',
};

// ============================================================================
// Grid Layout (computed from Deck data)
// ============================================================================

/**
 * Describes the computed grid layout for a single deck.
 * Built by `buildGridLayout()` in seat-grid-builder.ts.
 */
export interface GridLayout {
  /** Sorted unique Y-positions (column positions) */
  columns: number[];
  /** Y-positions after which an aisle exists (gap in Y-coords) */
  aisles: number[];
  /** [startRow, endRow] inclusive range of X-positions */
  rowRange: [number, number];
  /** Row numbers that are missing / skipped (e.g. row 13) */
  rowGaps: number[];
  /** Detected cabin boundaries ordered by startRow ascending */
  cabinBoundaries: CabinBoundary[];
}

/**
 * A contiguous cabin section within a deck.
 */
export interface CabinBoundary {
  /** Cabin code: F / C / W / M */
  cabin: string;
  /** First row X-coordinate in this cabin section */
  startRow: number;
  /** Last row X-coordinate in this cabin section */
  endRow: number;
  /** Human-readable label, e.g. "Business Class" */
  label: string;
}

// ============================================================================
// Seat Selection (UI state persisted in Zustand store)
// ============================================================================

/**
 * Represents a traveler's selected seat for one segment.
 */
export interface SelectedSeat {
  /** Seat designator, e.g. "14A" */
  number: string;
  /** Cabin code: F / C / W / M */
  cabin: string;
  /** Price amount (parsed float), undefined if free / not priced */
  price?: number;
  /** ISO currency code, e.g. "EUR" */
  currency?: string;
  /** Raw IATA characteristic codes from the API */
  characteristics: string[];
  /** Human-readable label, e.g. "14A · Fenster · Extra Beinfreiheit" */
  displayLabel: string;
}

// ============================================================================
// Price Tier (for colour coding and filtering)
// ============================================================================

export type PriceTier = 'free' | 'low' | 'mid' | 'high';

export interface PriceTierDefinition {
  tier: PriceTier;
  label: string;
  /** Upper bound exclusive (Infinity for last tier) */
  max: number;
  color: string;
}

// ============================================================================
// Passenger assignment colours
// ============================================================================

export const PASSENGER_COLORS = [
  '#EC4899', // pink-500
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EF4444', // red-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
] as const;

// ============================================================================
// Aircraft Profile (for SVG outlines and layout hints)
// ============================================================================

export type AircraftManufacturer = 'Airbus' | 'Boeing' | 'Embraer' | 'Bombardier' | 'ATR';

export interface AircraftProfile {
  name: string;
  iataCode: string;
  manufacturer: AircraftManufacturer;
  decks: ('MAIN' | 'UPPER')[];
  widebody: boolean;
  /** Typical economy layout, e.g. "3-3" or "3-4-3" */
  typicalLayout: string;
  /** SVG family key for outline graphics */
  svgFamily: string;
  /** Maximum passenger capacity (all-economy) */
  maxPax: number;
}

// ============================================================================
// Seat Characteristic Definition
// ============================================================================

export interface SeatCharacteristicDef {
  label: string;
  icon: string;
  /** If true, the characteristic is a potential drawback */
  warning?: boolean;
}

// ============================================================================
// Facility Type Definition
// ============================================================================

export interface FacilityTypeDef {
  label: string;
  icon: string;
}
