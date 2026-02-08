/**
 * IATA Seat Characteristic Code Mapping
 *
 * Complete mapping of IATA standard codes (PADIS 9825), Amadeus extensions,
 * and facility type codes used in seatmap rendering.
 */

import type { SeatCharacteristicDef, FacilityTypeDef } from '@/types/seatmap';

// ============================================================================
// IATA Standard Seat Characteristics (PADIS Code 9825)
// ============================================================================

export const SEAT_CHARACTERISTICS: Record<string, SeatCharacteristicDef> = {
  // ---- Position ----
  'W':  { label: 'Fenster', icon: '🪟' },
  'A':  { label: 'Gang', icon: '🚶' },
  'M':  { label: 'Mittelplatz', icon: '💺' },

  // ---- Special Locations ----
  'K':  { label: 'Bulkhead', icon: '🔲' },
  'E':  { label: 'Notausgang', icon: '🚪', warning: true },
  'IE': { label: 'Neben Notausgang', icon: '🚪' },
  'OW': { label: 'Über dem Flügel', icon: '✈️' },

  // ---- Legroom / Recline ----
  'L':  { label: 'Extra Beinfreiheit', icon: '🦵' },
  'LS': { label: 'Rückenlehne eingeschränkt', icon: '⚠️', warning: true },
  '1':  { label: 'Nicht verstellbar', icon: '⚠️', warning: true },
  'LR': { label: 'Eingeschränkte Beinfreiheit', icon: '⚠️', warning: true },

  // ---- Nearby Facilities ----
  'LA': { label: 'Neben Toilette', icon: '🚻', warning: true },
  'GA': { label: 'Neben Küche', icon: '🍽️', warning: true },
  'B':  { label: 'Bassinet-Position (Babybett)', icon: '👶' },
  'BK': { label: 'Bassinet-Position (Babybett)', icon: '👶' },
  'BA': { label: 'Neben Bar', icon: '🍸' },

  // ---- Accessibility ----
  'H':  { label: 'Rollstuhlgerecht', icon: '♿' },
  'CH': { label: 'Für Begleithund', icon: '🐕' },

  // ---- View / Comfort ----
  'V':  { label: 'Eingeschränkte Sicht', icon: '👁️', warning: true },
  'MV': { label: 'Vor Bildschirm', icon: '📺' },
  'GN': { label: 'Gruppenplatz', icon: '👥' },

  // ---- Seat Features ----
  'PC': { label: 'Steckdose vorhanden', icon: '🔌' },
  'USB': { label: 'USB-Anschluss', icon: '🔋' },
  'CC': { label: 'Mittlerer Sitzplatz', icon: '💺' },
  'J':  { label: 'Junktionsreihe', icon: '🔗' },
  'N':  { label: 'Kein Sitz an dieser Position', icon: '❌' },

  // ---- Recline Types ----
  'R':  { label: 'Rechte Seite', icon: '➡️' },
  'RS': { label: 'Rechte Seite', icon: '➡️' },

  // ---- Amadeus Extensions ----
  '1A': { label: 'Premium Sitzplatz', icon: '⭐' },
  '1A_AQC_PREMIUM_SEAT': { label: 'Premium Sitzplatz', icon: '⭐' },
  'P':  { label: 'Preferred Sitzplatz', icon: '⭐' },
  'UP': { label: 'Upgrade möglich', icon: '⬆️' },
  'EC': { label: 'Economy Comfort', icon: '🛋️' },
  'PS': { label: 'Premium Seat', icon: '⭐' },
  'XL': { label: 'Extra Legroom', icon: '🦵' },

  // ---- Cabin Type Indicators ----
  'F':  { label: 'First Class Sitz', icon: '👑' },
  'C':  { label: 'Business Class Sitz', icon: '💼' },
  'Y':  { label: 'Economy Class Sitz', icon: '💺' },
  'S':  { label: 'Premium Economy Sitz', icon: '🛋️' },

  // ---- Storage ----
  'ST': { label: 'Kein Stauraum unter Vordersitz', icon: '⚠️', warning: true },

  // ---- Buffer / Comfort ----
  'D':  { label: 'Kein Nachbarsitz (freier Platz)', icon: '😌' },
};

// ============================================================================
// Facility Types (used for deck.facilities[])
// ============================================================================

export const FACILITY_TYPES: Record<string, FacilityTypeDef> = {
  'LA': { label: 'Toilette', icon: '🚻' },
  'LV': { label: 'Toilette', icon: '🚻' },
  'G':  { label: 'Küche', icon: '🍽️' },
  'GY': { label: 'Küche', icon: '🍽️' },
  'CL': { label: 'Garderobe', icon: '🧥' },
  'ST': { label: 'Treppe', icon: '🪜' },         // A380, 747
  'BA': { label: 'Bar', icon: '🍸' },             // Emirates A380
  'SO': { label: 'Lager', icon: '📦' },
  'LB': { label: 'Lounge / Liegebereich', icon: '🛋️' },
  'SH': { label: 'Dusche', icon: '🚿' },         // Emirates First
  'E':  { label: 'Notausgang', icon: '🚪' },
  'EX': { label: 'Notausgang', icon: '🚪' },
  'BK': { label: 'Bassinet', icon: '👶' },
  'CR': { label: 'Bordkran', icon: '♿' },
  'C':  { label: 'Garderobe', icon: '🧥' },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Look up a seat characteristic definition by code.
 * Returns undefined for unknown codes.
 */
export function getSeatCharacteristic(code: string): SeatCharacteristicDef | undefined {
  return SEAT_CHARACTERISTICS[code];
}

/**
 * Look up a facility type definition by code.
 * Returns undefined for unknown codes.
 */
export function getFacilityType(code: string): FacilityTypeDef | undefined {
  return FACILITY_TYPES[code];
}

/**
 * Build a human-readable seat label from the seat number and its
 * characteristic codes.
 *
 * @example
 * getSeatLabel("14A", ["W", "L"])
 * // → "14A · Fenster · Extra Beinfreiheit"
 */
export function getSeatLabel(seatNumber: string, characteristicsCodes?: string[]): string {
  const parts = [seatNumber];

  if (characteristicsCodes) {
    for (const code of characteristicsCodes) {
      const def = SEAT_CHARACTERISTICS[code];
      if (def) {
        parts.push(def.label);
      }
    }
  }

  return parts.join(' · ');
}

/**
 * Check whether a seat's characteristics include any warning codes
 * (limited recline, restricted view, near lavatory, etc.).
 */
export function hasWarningCharacteristic(characteristicsCodes?: string[]): boolean {
  if (!characteristicsCodes) return false;
  return characteristicsCodes.some((code) => SEAT_CHARACTERISTICS[code]?.warning === true);
}

/**
 * Check whether a seat is in an exit row.
 */
export function isExitRow(characteristicsCodes?: string[]): boolean {
  if (!characteristicsCodes) return false;
  return characteristicsCodes.includes('E') || characteristicsCodes.includes('IE');
}

/**
 * Get all warning labels for a seat's characteristics.
 */
export function getWarningLabels(characteristicsCodes?: string[]): string[] {
  if (!characteristicsCodes) return [];
  return characteristicsCodes
    .map((code) => SEAT_CHARACTERISTICS[code])
    .filter((def): def is SeatCharacteristicDef => def?.warning === true)
    .map((def) => def.label);
}

/**
 * Get the facility label for a facility code, with dictionary fallback.
 *
 * @param code - Facility code from the API
 * @param dictionaries - Optional dictionaries from the API response for label resolution
 */
export function getFacilityLabel(
  code: string,
  dictionaries?: Record<string, string>
): string {
  const local = FACILITY_TYPES[code];
  if (local) return local.label;
  if (dictionaries?.[code]) return dictionaries[code];
  return code;
}
