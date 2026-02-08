/**
 * IATA Seat Characteristic Code Mapping
 *
 * Based on IATA PADIS Code List 9825 + Amadeus extensions.
 * Verified against real Amadeus SeatMap API responses (Feb 2026).
 *
 * IMPORTANT: Codes like CH (Chargeable) and 1A_AQC_PREMIUM_SEAT appear on
 * nearly ALL seats — they are generic pricing flags, NOT seat features!
 */

import type { SeatCharacteristicDef, FacilityTypeDef } from '@/types/seatmap';

// ============================================================================
// Codes that appear on 90%+ of all seats — purely system/pricing flags.
// These are NEVER shown in the UI and NEVER used for categorization.
// ============================================================================
export const GENERIC_SYSTEM_CODES = new Set([
  'CH',                   // PADIS 9825: Chargeable seat (appears on ~100% of seats)
  '1A',                   // Amadeus generic: seat priced by Amadeus system (~20-70%)
  '1A_AQC_PREMIUM_SEAT',  // Amadeus: "seat has individual pricing" (~95-100%, NOT actually premium!)
  'N',                    // PADIS 9825: No seat at this position / not operational
  'R',                    // PADIS 9825: Right side of aircraft (positional, redundant with column)
  'RS',                   // PADIS 9825: Right side of aircraft (synonym of R)
]);

// ============================================================================
// IATA Standard Seat Characteristics (PADIS Code 9825)
// ============================================================================

export const SEAT_CHARACTERISTICS: Record<string, SeatCharacteristicDef> = {
  // ---- Position (PADIS 9825) ----
  'W':  { label: 'Fenster', icon: '🪟' },
  'A':  { label: 'Gang', icon: '🚶' },
  'M':  { label: 'Mittelplatz', icon: '💺' },
  'CC': { label: 'Mittelplatz', icon: '💺' },  // PADIS: Center seat (center section)

  // ---- Special Locations (PADIS 9825) ----
  'K':  { label: 'Bulkhead', icon: '🔲' },
  'E':  { label: 'Notausgang', icon: '🚪', warning: true },
  'IE': { label: 'Neben Notausgang', icon: '🚪' },
  'OW': { label: 'Über dem Flügel', icon: '✈️' },
  'O':  { label: 'Über dem Flügel', icon: '✈️' },  // PADIS: Overwing — same as OW in some systems

  // ---- Legroom / Recline (PADIS 9825) ----
  'L':  { label: 'Extra Beinfreiheit', icon: '🦵' },
  'LS': { label: 'Rückenlehne eingeschränkt', icon: '⚠️', warning: true },
  '1':  { label: 'Nicht verstellbar', icon: '⚠️', warning: true },
  'LR': { label: 'Eingeschränkte Beinfreiheit', icon: '⚠️', warning: true },

  // ---- Nearby Facilities (PADIS 9825) ----
  'LA': { label: 'Neben Toilette', icon: '🚻', warning: true },
  'GA': { label: 'Neben Küche', icon: '🍽️', warning: true },
  'B':  { label: 'Bassinet-Position (Babybett)', icon: '👶' },
  'BK': { label: 'Bassinet-Position (Babybett)', icon: '👶' },
  'BA': { label: 'Neben Bar', icon: '🍸' },

  // ---- Accessibility (PADIS 9825) ----
  'H':  { label: 'Rollstuhlgerecht', icon: '♿' },

  // ---- View / Comfort (PADIS 9825) ----
  'V':  { label: 'Eingeschränkte Sicht', icon: '👁️', warning: true },
  'Q':  { label: 'Ruhezone', icon: '🤫' },

  // ---- Seat Features (PADIS 9825) ----
  'PC': { label: 'Steckdose vorhanden', icon: '🔌' },
  'I':  { label: 'Einzelsitz / individuell', icon: '💺' },  // PADIS: Individual seat
  'J':  { label: 'Junktionsreihe', icon: '🔗' },

  // ---- Pricing / Designation (PADIS 9825) ----
  'FC': { label: 'Kostenloser Sitzplatz', icon: '🆓' },  // PADIS: Free of Charge — no extra fee
  'DE': { label: 'Abschlagsfähig / Vergünstigt', icon: '💰' },  // PADIS: Discountable/Eligible for discount
  'U':  { label: 'Upgrade-Sitz', icon: '⬆️' },  // PADIS: Upper class/Upgrade eligible

  // ---- Amadeus Extension Codes ----
  '1B': { label: 'Eingeschränkte Beinfreiheit', icon: '⚠️', warning: true },  // Amadeus: restricted legroom/pitch
  '1D': { label: 'In der Nähe der Trennwand', icon: '🔲' },  // Amadeus: near divider/bulkhead area
  'MV': { label: 'Vor Bildschirm', icon: '📺' },

  // ---- Seat Format / Layout (PADIS 9825) ----
  '9':  { label: 'Mittlerer Platz (Reihe)', icon: '💺' },  // PADIS: Center seat in a row
  'AG': { label: 'Am Gang (beidseitig erreichbar)', icon: '🚶' },  // PADIS: Adjacent to gang (aisle accessible)
  'AL': { label: 'Gang-seitig links', icon: '🚶' },  // PADIS: Aisle left
  'MA': { label: 'Mittlerer Gang', icon: '🚶' },  // PADIS: Middle aisle seat

  // ---- Amadeus Business/Cabin ----
  'P':  { label: 'Preferred Sitzplatz', icon: '⭐' },
  'UP': { label: 'Upgrade möglich', icon: '⬆️' },
  'EC': { label: 'Economy Comfort', icon: '🛋️' },
  'PS': { label: 'Premium Seat', icon: '⭐' },
  'XL': { label: 'Extra Legroom', icon: '🦵' },
  'GN': { label: 'Gruppenplatz', icon: '👥' },

  // ---- Cabin Type Indicators (PADIS 9825) ----
  'F':  { label: 'First Class', icon: '👑' },
  'C':  { label: 'Business Class', icon: '💼' },
  'Y':  { label: 'Economy Class', icon: '💺' },
  'S':  { label: 'Premium Economy', icon: '🛋️' },

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
  'ST': { label: 'Treppe', icon: '🪜' },
  'BA': { label: 'Bar', icon: '🍸' },
  'SO': { label: 'Lager', icon: '📦' },
  'LB': { label: 'Lounge / Liegebereich', icon: '🛋️' },
  'SH': { label: 'Dusche', icon: '🚿' },
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
 * Skips generic system codes (CH, 1A, etc.) — returns undefined for those.
 */
export function getSeatCharacteristic(code: string): SeatCharacteristicDef | undefined {
  if (GENERIC_SYSTEM_CODES.has(code)) return undefined;
  return SEAT_CHARACTERISTICS[code];
}

/**
 * Look up a facility type definition by code.
 */
export function getFacilityType(code: string): FacilityTypeDef | undefined {
  return FACILITY_TYPES[code];
}

/**
 * Build a human-readable seat label from the seat number and its
 * characteristic codes. Skips generic system codes.
 */
export function getSeatLabel(seatNumber: string, characteristicsCodes?: string[]): string {
  const parts = [seatNumber];

  if (characteristicsCodes) {
    for (const code of characteristicsCodes) {
      if (GENERIC_SYSTEM_CODES.has(code)) continue;
      const def = SEAT_CHARACTERISTICS[code];
      if (def) {
        parts.push(def.label);
      }
    }
  }

  return parts.join(' · ');
}

/**
 * Check whether a seat's characteristics include any warning codes.
 */
export function hasWarningCharacteristic(characteristicsCodes?: string[]): boolean {
  if (!characteristicsCodes) return false;
  return characteristicsCodes.some(
    (code) => !GENERIC_SYSTEM_CODES.has(code) && SEAT_CHARACTERISTICS[code]?.warning === true
  );
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
    .filter((code) => !GENERIC_SYSTEM_CODES.has(code))
    .map((code) => SEAT_CHARACTERISTICS[code])
    .filter((def): def is SeatCharacteristicDef => def?.warning === true)
    .map((def) => def.label);
}

/**
 * Get the facility label for a facility code, with dictionary fallback.
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
