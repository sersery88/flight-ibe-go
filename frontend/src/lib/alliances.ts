/**
 * Airline Alliance Mapping
 * Maps IATA airline codes to their respective alliances.
 */

export const ALLIANCES: Record<string, string[]> = {
  'Star Alliance': [
    'LH', 'TK', 'UA', 'SQ', 'NH', 'OS', 'LX', 'SK', 'TP', 'AC',
    'ET', 'AI', 'MS', 'A3', 'AV', 'BR', 'CA', 'CM', 'EN', 'LO',
    'NZ', 'OZ', 'SA', 'SN', 'TG', 'ZH', 'CL', 'WK', 'EW',
  ],
  'SkyTeam': [
    'AF', 'KL', 'DL', 'AZ', 'KE', 'VN', 'CI', 'MU', 'ME', 'SV',
    'AR', 'AM', 'CZ', 'GA', 'KQ', 'RO', 'UX', 'SU',
  ],
  'Oneworld': [
    'BA', 'QF', 'AA', 'IB', 'CX', 'JL', 'QR', 'AY', 'MH', 'RJ',
    'S7', 'AS', 'FJ', 'UL',
  ],
};

/** Reverse lookup: airline code → alliance name */
const _airlineToAlliance: Record<string, string> = {};
for (const [alliance, airlines] of Object.entries(ALLIANCES)) {
  for (const code of airlines) {
    _airlineToAlliance[code] = alliance;
  }
}

/**
 * Get the alliance name for an airline code.
 * Returns null if the airline is not part of any alliance.
 */
export function getAllianceName(airlineCode: string): string | null {
  return _airlineToAlliance[airlineCode] ?? null;
}

/**
 * Get all partner airlines in the same alliance.
 * Returns empty array if the airline is not part of any alliance.
 */
export function getAlliancePartners(airlineCode: string): string[] {
  const alliance = getAllianceName(airlineCode);
  if (!alliance) return [];
  return ALLIANCES[alliance].filter((code) => code !== airlineCode);
}

/**
 * Get all airlines that accept a given FQTV program.
 * This includes the airline itself plus all alliance partners.
 */
export function getFQTVAcceptingAirlines(programOwner: string): string[] {
  const alliance = getAllianceName(programOwner);
  if (!alliance) return [programOwner];
  return ALLIANCES[alliance];
}
