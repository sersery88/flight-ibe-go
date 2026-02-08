/**
 * Seat Category System — Type-based visual differentiation for seatmap seats.
 *
 * Categorizes seats by their IATA characteristic codes rather than price,
 * providing clear visual distinction between exit rows, preferred seats,
 * extra legroom, bassinet positions, etc.
 */

import type { Seat } from '@/types/seatmap';

// ============================================================================
// Types
// ============================================================================

export type SeatCategory =
  | 'exit'       // E, IE
  | 'preferred'  // P, PS, 1A, EC
  | 'extraleg'   // L, XL (when NOT exit)
  | 'bulkhead'   // K
  | 'bassinet'   // B, BK
  | 'accessible' // H
  | 'pet'        // CH
  | 'restricted' // Has warnings but no special category
  | 'standard';  // Default

export interface CategoryStyle {
  bg: string;
  text: string;
  ring: string;
  icon?: string;     // Mini-icon for corner badge (emoji)
  label: string;     // German label
  filterKey: string; // For legend filter
}

// ============================================================================
// Category Detection
// ============================================================================

/**
 * Determine the primary seat category from IATA characteristic codes.
 * Priority order — first match wins.
 */
export function getSeatCategory(codes?: string[]): SeatCategory {
  if (!codes || codes.length === 0) return 'standard';

  // Priority order — first match wins
  if (codes.includes('E') || codes.includes('IE')) return 'exit';
  // Only full premium code, NOT bare '1A' (which is generic Amadeus "chargeable")
  if (codes.some(c => ['P', 'PS', '1A_AQC_PREMIUM_SEAT', 'EC'].includes(c))) return 'preferred';
  if (codes.includes('L') || codes.includes('XL')) return 'extraleg';
  if (codes.includes('K')) return 'bulkhead';
  if (codes.includes('B') || codes.includes('BK')) return 'bassinet';
  if (codes.includes('H')) return 'accessible';
  // CH = "Chargeable" in Amadeus, NOT pet-friendly. Real pet code would be specific.
  // if (codes.includes('CH')) return 'pet';

  return 'standard';
}

// ============================================================================
// Category Styles
// ============================================================================

/**
 * Visual styles per category. Seat type has priority over price!
 * "free" standard seats get emerald instead of their category color.
 */
export const CATEGORY_STYLES: Record<SeatCategory, CategoryStyle> = {
  exit: {
    bg: 'bg-amber-500',
    text: 'text-white',
    ring: 'ring-amber-400',
    icon: '🚪',
    label: 'Notausgang',
    filterKey: 'exit',
  },
  preferred: {
    bg: 'bg-violet-500',
    text: 'text-white',
    ring: 'ring-violet-400',
    icon: '⭐',
    label: 'Preferred',
    filterKey: 'preferred',
  },
  extraleg: {
    bg: 'bg-teal-500',
    text: 'text-white',
    ring: 'ring-teal-400',
    icon: '🦵',
    label: 'Extra Beinfreiheit',
    filterKey: 'extraleg',
  },
  bulkhead: {
    bg: 'bg-indigo-400',
    text: 'text-white',
    ring: 'ring-indigo-300',
    icon: '🔲',
    label: 'Bulkhead',
    filterKey: 'bulkhead',
  },
  bassinet: {
    bg: 'bg-pink-400',
    text: 'text-white',
    ring: 'ring-pink-300',
    icon: '👶',
    label: 'Bassinet (Baby)',
    filterKey: 'bassinet',
  },
  accessible: {
    bg: 'bg-sky-500',
    text: 'text-white',
    ring: 'ring-sky-400',
    icon: '♿',
    label: 'Rollstuhlgerecht',
    filterKey: 'accessible',
  },
  pet: {
    bg: 'bg-emerald-400',
    text: 'text-white',
    ring: 'ring-emerald-300',
    icon: '🐕',
    label: 'Haustier erlaubt',
    filterKey: 'pet',
  },
  restricted: {
    bg: 'bg-sky-300',
    text: 'text-white',
    ring: 'ring-sky-200',
    label: 'Eingeschränkt',
    filterKey: 'restricted',
  },
  standard: {
    bg: 'bg-sky-400',
    text: 'text-white',
    ring: 'ring-sky-300',
    label: 'Standard',
    filterKey: 'standard',
  },
};

// ============================================================================
// Available Categories Discovery
// ============================================================================

/** Display order for categories */
const CATEGORY_ORDER: SeatCategory[] = [
  'exit',
  'preferred',
  'extraleg',
  'bulkhead',
  'bassinet',
  'accessible',
  'pet',
  'restricted',
  'standard',
];

/**
 * Discover which seat categories actually exist on a set of seats.
 * Returns categories in display order, only those that are present.
 */
export function getAvailableCategories(seats: Seat[]): SeatCategory[] {
  const found = new Set<SeatCategory>();
  for (const seat of seats) {
    found.add(getSeatCategory(seat.characteristicsCodes));
  }
  return CATEGORY_ORDER.filter(c => found.has(c));
}
