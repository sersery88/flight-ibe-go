/**
 * Seat Grid Builder — Core logic for computing the seatmap grid layout
 * from raw Amadeus deck data.
 */

import type {
  Deck,
  Seat,
  GridLayout,
  CabinBoundary,
  SeatStatus,
  CabinCode,
  CABIN_LABELS as CabinLabelsType,
} from '@/types/seatmap';
import { CABIN_LABELS } from '@/types/seatmap';

// ============================================================================
// Column Labels (IATA standard: skip "I")
// ============================================================================

/**
 * Standard seat column letters.  "I" is always skipped per IATA convention
 * to avoid confusion with the number 1.
 */
const COLUMN_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
] as const;

/**
 * Map a zero-based column index to a seat column letter (A, B, C, … skipping I).
 */
export function getColumnLabel(yIndex: number, _columns?: number[]): string {
  if (yIndex >= 0 && yIndex < COLUMN_LETTERS.length) {
    return COLUMN_LETTERS[yIndex];
  }
  // Fallback for very wide cabins (unlikely but safe)
  return String.fromCharCode(65 + yIndex + (yIndex >= 8 ? 1 : 0)); // skip 'I' = 73
}

// ============================================================================
// Grid Layout Builder
// ============================================================================

/**
 * Analyse a deck's seats and produce a `GridLayout` that describes columns,
 * aisles, row range, gaps, and cabin boundaries.
 */
export function buildGridLayout(deck: Deck): GridLayout {
  const seats = deck.seats;

  if (seats.length === 0) {
    return {
      columns: [],
      aisles: [],
      rowRange: [0, 0],
      rowGaps: [],
      cabinBoundaries: [],
    };
  }

  // 1. Collect all unique Y-positions → columns
  const ySet = new Set<number>();
  for (const s of seats) {
    if (s.coordinates?.y != null) ySet.add(s.coordinates.y);
  }
  const columns = [...ySet].sort((a, b) => a - b);

  // 2. Detect aisles: significant gaps between adjacent Y-positions
  const aisles: number[] = [];
  for (let i = 1; i < columns.length; i++) {
    if (columns[i] - columns[i - 1] > 1) {
      aisles.push(columns[i - 1]);
    }
  }

  // 3. Collect all unique X-positions → rows
  const xSet = new Set<number>();
  for (const s of seats) {
    if (s.coordinates?.x != null) xSet.add(s.coordinates.x);
  }
  const sortedRows = [...xSet].sort((a, b) => a - b);
  const rowRange: [number, number] = [
    sortedRows[0],
    sortedRows[sortedRows.length - 1],
  ];

  // 4. Detect row gaps (e.g. row 13 skipped)
  const rowGaps: number[] = [];
  for (let i = 1; i < sortedRows.length; i++) {
    for (let gap = sortedRows[i - 1] + 1; gap < sortedRows[i]; gap++) {
      rowGaps.push(gap);
    }
  }

  // 5. Detect cabin boundaries
  const cabinBoundaries = detectCabinBoundaries(seats);

  return { columns, aisles, rowRange, rowGaps, cabinBoundaries };
}

// ============================================================================
// Cabin Boundary Detection
// ============================================================================

/**
 * Walk through seats ordered by X-coordinate and detect where the cabin code
 * changes.  Returns one `CabinBoundary` per contiguous cabin section.
 */
function detectCabinBoundaries(seats: Seat[]): CabinBoundary[] {
  // Build a map: row (x) → cabin code (using majority vote per row)
  const rowCabinMap = new Map<number, string>();

  for (const seat of seats) {
    const x = seat.coordinates?.x;
    const cabin = seat.cabin;
    if (x == null || !cabin) continue;

    // Simple: first cabin seen per row wins (they should all be the same)
    if (!rowCabinMap.has(x)) {
      rowCabinMap.set(x, cabin);
    }
  }

  const sortedRows = [...rowCabinMap.keys()].sort((a, b) => a - b);
  if (sortedRows.length === 0) return [];

  const boundaries: CabinBoundary[] = [];
  let currentCabin = rowCabinMap.get(sortedRows[0])!;
  let startRow = sortedRows[0];

  for (let i = 1; i < sortedRows.length; i++) {
    const cabin = rowCabinMap.get(sortedRows[i])!;
    if (cabin !== currentCabin) {
      boundaries.push({
        cabin: currentCabin,
        startRow,
        endRow: sortedRows[i - 1],
        label: CABIN_LABELS[currentCabin as CabinCode] ?? currentCabin,
      });
      currentCabin = cabin;
      startRow = sortedRows[i];
    }
  }

  // Final boundary
  boundaries.push({
    cabin: currentCabin,
    startRow,
    endRow: sortedRows[sortedRows.length - 1],
    label: CABIN_LABELS[currentCabin as CabinCode] ?? currentCabin,
  });

  return boundaries;
}

// ============================================================================
// Seat Helpers
// ============================================================================

/**
 * Determine the UI status of a seat.
 *
 * If `selectedSeatNumbers` is provided, seats whose `number` appears in the
 * set are reported as `'SELECTED'`.  Otherwise the Amadeus availability status
 * for the given `travelerId` is returned (defaulting to `'BLOCKED'`).
 */
export function getSeatStatus(
  seat: Seat,
  travelerId?: string,
  selectedSeatNumbers?: Set<string>
): SeatStatus {
  // Check local selection first
  if (selectedSeatNumbers?.has(seat.number)) {
    return 'SELECTED';
  }

  if (!seat.travelerPricing || seat.travelerPricing.length === 0) {
    return 'BLOCKED';
  }

  // If a specific traveler is given, use their status
  if (travelerId) {
    const tp = seat.travelerPricing.find((p) => p.travelerId === travelerId);
    return (tp?.seatAvailabilityStatus as SeatStatus) ?? 'BLOCKED';
  }

  // Fallback: seat is available if ANY traveler can book it
  const hasAvailable = seat.travelerPricing.some(
    (p) => p.seatAvailabilityStatus === 'AVAILABLE'
  );
  return hasAvailable ? 'AVAILABLE' : 'BLOCKED';
}

/**
 * Extract the numeric price for a seat for a given traveler.
 * Returns `null` if no pricing info exists or the seat is not priced.
 */
export function getSeatPrice(seat: Seat, travelerId: string): number | null {
  if (!seat.travelerPricing) return null;

  const tp = seat.travelerPricing.find((p) => p.travelerId === travelerId);
  if (!tp?.price) return null;

  // price.total is the canonical field; fall back to base
  const raw = tp.price.total ?? tp.price.base;
  if (!raw) return null;

  const parsed = parseFloat(raw);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extract the currency for a seat's price for a given traveler.
 */
export function getSeatCurrency(seat: Seat, travelerId: string): string | undefined {
  const tp = seat.travelerPricing?.find((p) => p.travelerId === travelerId);
  return tp?.price?.currency ?? undefined;
}

/**
 * Extract the row number from a seat designator like "14A" → 14.
 */
export function getRowFromSeatNumber(seatNumber: string): number {
  const match = seatNumber.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract the column letter from a seat designator like "14A" → "A".
 */
export function getColumnFromSeatNumber(seatNumber: string): string {
  const match = seatNumber.match(/([A-Z]+)$/);
  return match ? match[1] : '';
}
