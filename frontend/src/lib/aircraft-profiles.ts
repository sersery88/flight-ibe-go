/**
 * Aircraft Profiles — IATA type codes mapped to aircraft metadata.
 *
 * Used for SVG outline selection, widebody detection, multi-deck handling,
 * and display-friendly aircraft names.
 */

import type { AircraftProfile } from '@/types/seatmap';

// ============================================================================
// Profile Database
// ============================================================================

export const AIRCRAFT_PROFILES: Record<string, AircraftProfile> = {
  // ────────────────────────────────────────────────────────────────────────
  // Airbus Widebody
  // ────────────────────────────────────────────────────────────────────────
  '380': {
    name: 'Airbus A380',
    iataCode: '380',
    manufacturer: 'Airbus',
    decks: ['MAIN', 'UPPER'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: 'a380',
    maxPax: 853,
  },
  '388': {
    name: 'Airbus A380-800',
    iataCode: '388',
    manufacturer: 'Airbus',
    decks: ['MAIN', 'UPPER'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: 'a380',
    maxPax: 853,
  },
  '359': {
    name: 'Airbus A350-900',
    iataCode: '359',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: 'a350',
    maxPax: 440,
  },
  '351': {
    name: 'Airbus A350-1000',
    iataCode: '351',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: 'a350',
    maxPax: 480,
  },
  '35K': {
    name: 'Airbus A350-1000',
    iataCode: '35K',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: 'a350',
    maxPax: 480,
  },
  '333': {
    name: 'Airbus A330-300',
    iataCode: '333',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '2-4-2',
    svgFamily: 'a330',
    maxPax: 440,
  },
  '332': {
    name: 'Airbus A330-200',
    iataCode: '332',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '2-4-2',
    svgFamily: 'a330',
    maxPax: 406,
  },
  '338': {
    name: 'Airbus A330-800neo',
    iataCode: '338',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '2-4-2',
    svgFamily: 'a330',
    maxPax: 406,
  },
  '339': {
    name: 'Airbus A330-900neo',
    iataCode: '339',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '2-4-2',
    svgFamily: 'a330',
    maxPax: 440,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Boeing Widebody
  // ────────────────────────────────────────────────────────────────────────
  '744': {
    name: 'Boeing 747-400',
    iataCode: '744',
    manufacturer: 'Boeing',
    decks: ['MAIN', 'UPPER'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: '747',
    maxPax: 524,
  },
  '74E': {
    name: 'Boeing 747-400',
    iataCode: '74E',
    manufacturer: 'Boeing',
    decks: ['MAIN', 'UPPER'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: '747',
    maxPax: 524,
  },
  '748': {
    name: 'Boeing 747-8',
    iataCode: '748',
    manufacturer: 'Boeing',
    decks: ['MAIN', 'UPPER'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: '747',
    maxPax: 605,
  },
  '74H': {
    name: 'Boeing 747-8',
    iataCode: '74H',
    manufacturer: 'Boeing',
    decks: ['MAIN', 'UPPER'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: '747',
    maxPax: 605,
  },
  '77W': {
    name: 'Boeing 777-300ER',
    iataCode: '77W',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: '777',
    maxPax: 550,
  },
  '773': {
    name: 'Boeing 777-300',
    iataCode: '773',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-4-3',
    svgFamily: '777',
    maxPax: 550,
  },
  '772': {
    name: 'Boeing 777-200',
    iataCode: '772',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: '777',
    maxPax: 440,
  },
  '77L': {
    name: 'Boeing 777-200LR',
    iataCode: '77L',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: '777',
    maxPax: 440,
  },
  '789': {
    name: 'Boeing 787-9 Dreamliner',
    iataCode: '789',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: '787',
    maxPax: 420,
  },
  '788': {
    name: 'Boeing 787-8 Dreamliner',
    iataCode: '788',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: '787',
    maxPax: 381,
  },
  '78X': {
    name: 'Boeing 787-10 Dreamliner',
    iataCode: '78X',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: true,
    typicalLayout: '3-3-3',
    svgFamily: '787',
    maxPax: 440,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Airbus Narrowbody
  // ────────────────────────────────────────────────────────────────────────
  '321': {
    name: 'Airbus A321',
    iataCode: '321',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 236,
  },
  '32N': {
    name: 'Airbus A321neo',
    iataCode: '32N',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 244,
  },
  '32Q': {
    name: 'Airbus A321neo',
    iataCode: '32Q',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 244,
  },
  '320': {
    name: 'Airbus A320',
    iataCode: '320',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 194,
  },
  '32A': {
    name: 'Airbus A320',
    iataCode: '32A',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 194,
  },
  '319': {
    name: 'Airbus A319',
    iataCode: '319',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 160,
  },
  '318': {
    name: 'Airbus A318',
    iataCode: '318',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 132,
  },
  '221': {
    name: 'Airbus A220-100',
    iataCode: '221',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-3',
    svgFamily: 'a320',
    maxPax: 135,
  },
  '223': {
    name: 'Airbus A220-300',
    iataCode: '223',
    manufacturer: 'Airbus',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-3',
    svgFamily: 'a320',
    maxPax: 160,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Boeing Narrowbody
  // ────────────────────────────────────────────────────────────────────────
  '738': {
    name: 'Boeing 737-800',
    iataCode: '738',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: '737',
    maxPax: 189,
  },
  '73H': {
    name: 'Boeing 737-800',
    iataCode: '73H',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: '737',
    maxPax: 189,
  },
  '7M8': {
    name: 'Boeing 737 MAX 8',
    iataCode: '7M8',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: '737',
    maxPax: 210,
  },
  '739': {
    name: 'Boeing 737-900',
    iataCode: '739',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: '737',
    maxPax: 220,
  },
  '7M9': {
    name: 'Boeing 737 MAX 9',
    iataCode: '7M9',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: '737',
    maxPax: 220,
  },
  '73G': {
    name: 'Boeing 737-700',
    iataCode: '73G',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: '737',
    maxPax: 149,
  },
  '7M7': {
    name: 'Boeing 737 MAX 7',
    iataCode: '7M7',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: '737',
    maxPax: 172,
  },
  '752': {
    name: 'Boeing 757-200',
    iataCode: '752',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320', // similar shape to narrow-body
    maxPax: 239,
  },
  '753': {
    name: 'Boeing 757-300',
    iataCode: '753',
    manufacturer: 'Boeing',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '3-3',
    svgFamily: 'a320',
    maxPax: 289,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Regional Jets
  // ────────────────────────────────────────────────────────────────────────
  'E95': {
    name: 'Embraer E195',
    iataCode: 'E95',
    manufacturer: 'Embraer',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 132,
  },
  'E90': {
    name: 'Embraer E190',
    iataCode: 'E90',
    manufacturer: 'Embraer',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 114,
  },
  'E75': {
    name: 'Embraer E175',
    iataCode: 'E75',
    manufacturer: 'Embraer',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 88,
  },
  'E70': {
    name: 'Embraer E170',
    iataCode: 'E70',
    manufacturer: 'Embraer',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 80,
  },
  '290': {
    name: 'Embraer E190-E2',
    iataCode: '290',
    manufacturer: 'Embraer',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 114,
  },
  '295': {
    name: 'Embraer E195-E2',
    iataCode: '295',
    manufacturer: 'Embraer',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 146,
  },
  'CR9': {
    name: 'CRJ-900',
    iataCode: 'CR9',
    manufacturer: 'Bombardier',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190', // similar small RJ silhouette
    maxPax: 90,
  },
  'CR7': {
    name: 'CRJ-700',
    iataCode: 'CR7',
    manufacturer: 'Bombardier',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 78,
  },
  'CRK': {
    name: 'CRJ-1000',
    iataCode: 'CRK',
    manufacturer: 'Bombardier',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 104,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Turboprops
  // ────────────────────────────────────────────────────────────────────────
  'AT7': {
    name: 'ATR 72',
    iataCode: 'AT7',
    manufacturer: 'ATR',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190', // small silhouette
    maxPax: 78,
  },
  'AT4': {
    name: 'ATR 42',
    iataCode: 'AT4',
    manufacturer: 'ATR',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 50,
  },
  'DH4': {
    name: 'Dash 8 Q400',
    iataCode: 'DH4',
    manufacturer: 'Bombardier',
    decks: ['MAIN'],
    widebody: false,
    typicalLayout: '2-2',
    svgFamily: 'e190',
    maxPax: 90,
  },
};

// ============================================================================
// Lookup Function
// ============================================================================

/** Default profile used when the IATA code is not in our database. */
const UNKNOWN_PROFILE: AircraftProfile = {
  name: 'Unknown Aircraft',
  iataCode: '???',
  manufacturer: 'Boeing', // safe default
  decks: ['MAIN'],
  widebody: false,
  typicalLayout: '3-3',
  svgFamily: 'a320',
  maxPax: 180,
};

/**
 * Look up an aircraft profile by IATA type designator code.
 *
 * @returns The matching profile, or a generic fallback if the code is unknown.
 */
export function getAircraftProfile(iataCode: string | undefined): AircraftProfile {
  if (!iataCode) return UNKNOWN_PROFILE;
  return AIRCRAFT_PROFILES[iataCode.toUpperCase()] ?? AIRCRAFT_PROFILES[iataCode] ?? UNKNOWN_PROFILE;
}

/**
 * Check whether an aircraft supports multiple decks (A380, 747).
 */
export function isMultiDeck(iataCode: string | undefined): boolean {
  return getAircraftProfile(iataCode).decks.length > 1;
}

/**
 * Check whether an aircraft is a widebody.
 */
export function isWidebody(iataCode: string | undefined): boolean {
  return getAircraftProfile(iataCode).widebody;
}

/**
 * Get a list of all known SVG families.
 */
export function getSvgFamilies(): string[] {
  const families = new Set<string>();
  for (const p of Object.values(AIRCRAFT_PROFILES)) {
    families.add(p.svgFamily);
  }
  return [...families].sort();
}
