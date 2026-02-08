/**
 * Full ISO 3166-1 Country/Nationality list
 * Sorted: DACH countries first, then alphabetical (German names)
 * Includes flag emoji and phone prefix
 */

export interface Country {
  /** ISO 3166-1 alpha-2 code */
  code: string;
  /** Country name in German */
  name: string;
  /** Flag emoji */
  flag: string;
  /** Phone prefix (e.g. "+49") */
  phone: string;
}

// DACH countries first, then alphabetical by German name
export const COUNTRIES: Country[] = [
  // --- DACH ---
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', phone: '+49' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', phone: '+43' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭', phone: '+41' },
  // --- Separator marker (for UI) ---
  // --- Rest alphabetical by German name ---
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', phone: '+93' },
  { code: 'EG', name: 'Ägypten', flag: '🇪🇬', phone: '+20' },
  { code: 'AL', name: 'Albanien', flag: '🇦🇱', phone: '+355' },
  { code: 'DZ', name: 'Algerien', flag: '🇩🇿', phone: '+213' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', phone: '+376' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', phone: '+244' },
  { code: 'AG', name: 'Antigua und Barbuda', flag: '🇦🇬', phone: '+1' },
  { code: 'GQ', name: 'Äquatorialguinea', flag: '🇬🇶', phone: '+240' },
  { code: 'AR', name: 'Argentinien', flag: '🇦🇷', phone: '+54' },
  { code: 'AM', name: 'Armenien', flag: '🇦🇲', phone: '+374' },
  { code: 'AZ', name: 'Aserbaidschan', flag: '🇦🇿', phone: '+994' },
  { code: 'ET', name: 'Äthiopien', flag: '🇪🇹', phone: '+251' },
  { code: 'AU', name: 'Australien', flag: '🇦🇺', phone: '+61' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', phone: '+1' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', phone: '+973' },
  { code: 'BD', name: 'Bangladesch', flag: '🇧🇩', phone: '+880' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', phone: '+1' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', phone: '+375' },
  { code: 'BE', name: 'Belgien', flag: '🇧🇪', phone: '+32' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', phone: '+501' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', phone: '+229' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', phone: '+975' },
  { code: 'BO', name: 'Bolivien', flag: '🇧🇴', phone: '+591' },
  { code: 'BA', name: 'Bosnien und Herzegowina', flag: '🇧🇦', phone: '+387' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', phone: '+267' },
  { code: 'BR', name: 'Brasilien', flag: '🇧🇷', phone: '+55' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', phone: '+673' },
  { code: 'BG', name: 'Bulgarien', flag: '🇧🇬', phone: '+359' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', phone: '+226' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', phone: '+257' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phone: '+56' },
  { code: 'CN', name: 'China', flag: '🇨🇳', phone: '+86' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', phone: '+506' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', phone: '+225' },
  { code: 'DK', name: 'Dänemark', flag: '🇩🇰', phone: '+45' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', phone: '+1' },
  { code: 'DO', name: 'Dominikanische Republik', flag: '🇩🇴', phone: '+1' },
  { code: 'DJ', name: 'Dschibuti', flag: '🇩🇯', phone: '+253' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', phone: '+593' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', phone: '+503' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', phone: '+291' },
  { code: 'EE', name: 'Estland', flag: '🇪🇪', phone: '+372' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', phone: '+268' },
  { code: 'FJ', name: 'Fidschi', flag: '🇫🇯', phone: '+679' },
  { code: 'FI', name: 'Finnland', flag: '🇫🇮', phone: '+358' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷', phone: '+33' },
  { code: 'GA', name: 'Gabun', flag: '🇬🇦', phone: '+241' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', phone: '+220' },
  { code: 'GE', name: 'Georgien', flag: '🇬🇪', phone: '+995' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', phone: '+233' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', phone: '+1' },
  { code: 'GR', name: 'Griechenland', flag: '🇬🇷', phone: '+30' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', phone: '+502' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', phone: '+224' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', phone: '+245' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', phone: '+592' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', phone: '+509' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', phone: '+504' },
  { code: 'IN', name: 'Indien', flag: '🇮🇳', phone: '+91' },
  { code: 'ID', name: 'Indonesien', flag: '🇮🇩', phone: '+62' },
  { code: 'IQ', name: 'Irak', flag: '🇮🇶', phone: '+964' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', phone: '+98' },
  { code: 'IE', name: 'Irland', flag: '🇮🇪', phone: '+353' },
  { code: 'IS', name: 'Island', flag: '🇮🇸', phone: '+354' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', phone: '+972' },
  { code: 'IT', name: 'Italien', flag: '🇮🇹', phone: '+39' },
  { code: 'JM', name: 'Jamaika', flag: '🇯🇲', phone: '+1' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', phone: '+81' },
  { code: 'YE', name: 'Jemen', flag: '🇾🇪', phone: '+967' },
  { code: 'JO', name: 'Jordanien', flag: '🇯🇴', phone: '+962' },
  { code: 'KH', name: 'Kambodscha', flag: '🇰🇭', phone: '+855' },
  { code: 'CM', name: 'Kamerun', flag: '🇨🇲', phone: '+237' },
  { code: 'CA', name: 'Kanada', flag: '🇨🇦', phone: '+1' },
  { code: 'CV', name: 'Kap Verde', flag: '🇨🇻', phone: '+238' },
  { code: 'KZ', name: 'Kasachstan', flag: '🇰🇿', phone: '+7' },
  { code: 'QA', name: 'Katar', flag: '🇶🇦', phone: '+974' },
  { code: 'KE', name: 'Kenia', flag: '🇰🇪', phone: '+254' },
  { code: 'KG', name: 'Kirgisistan', flag: '🇰🇬', phone: '+996' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', phone: '+686' },
  { code: 'CO', name: 'Kolumbien', flag: '🇨🇴', phone: '+57' },
  { code: 'KM', name: 'Komoren', flag: '🇰🇲', phone: '+269' },
  { code: 'CD', name: 'Kongo (Dem. Rep.)', flag: '🇨🇩', phone: '+243' },
  { code: 'CG', name: 'Kongo (Rep.)', flag: '🇨🇬', phone: '+242' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', phone: '+383' },
  { code: 'HR', name: 'Kroatien', flag: '🇭🇷', phone: '+385' },
  { code: 'CU', name: 'Kuba', flag: '🇨🇺', phone: '+53' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', phone: '+965' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', phone: '+856' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', phone: '+266' },
  { code: 'LV', name: 'Lettland', flag: '🇱🇻', phone: '+371' },
  { code: 'LB', name: 'Libanon', flag: '🇱🇧', phone: '+961' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', phone: '+231' },
  { code: 'LY', name: 'Libyen', flag: '🇱🇾', phone: '+218' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', phone: '+423' },
  { code: 'LT', name: 'Litauen', flag: '🇱🇹', phone: '+370' },
  { code: 'LU', name: 'Luxemburg', flag: '🇱🇺', phone: '+352' },
  { code: 'MG', name: 'Madagaskar', flag: '🇲🇬', phone: '+261' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', phone: '+265' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', phone: '+60' },
  { code: 'MV', name: 'Malediven', flag: '🇲🇻', phone: '+960' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', phone: '+223' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', phone: '+356' },
  { code: 'MA', name: 'Marokko', flag: '🇲🇦', phone: '+212' },
  { code: 'MH', name: 'Marshallinseln', flag: '🇲🇭', phone: '+692' },
  { code: 'MR', name: 'Mauretanien', flag: '🇲🇷', phone: '+222' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', phone: '+230' },
  { code: 'MX', name: 'Mexiko', flag: '🇲🇽', phone: '+52' },
  { code: 'FM', name: 'Mikronesien', flag: '🇫🇲', phone: '+691' },
  { code: 'MD', name: 'Moldau', flag: '🇲🇩', phone: '+373' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', phone: '+377' },
  { code: 'MN', name: 'Mongolei', flag: '🇲🇳', phone: '+976' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', phone: '+382' },
  { code: 'MZ', name: 'Mosambik', flag: '🇲🇿', phone: '+258' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', phone: '+95' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', phone: '+264' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', phone: '+674' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', phone: '+977' },
  { code: 'NZ', name: 'Neuseeland', flag: '🇳🇿', phone: '+64' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', phone: '+505' },
  { code: 'NL', name: 'Niederlande', flag: '🇳🇱', phone: '+31' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', phone: '+227' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phone: '+234' },
  { code: 'KP', name: 'Nordkorea', flag: '🇰🇵', phone: '+850' },
  { code: 'MK', name: 'Nordmazedonien', flag: '🇲🇰', phone: '+389' },
  { code: 'NO', name: 'Norwegen', flag: '🇳🇴', phone: '+47' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', phone: '+968' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', phone: '+92' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', phone: '+680' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', phone: '+507' },
  { code: 'PG', name: 'Papua-Neuguinea', flag: '🇵🇬', phone: '+675' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', phone: '+595' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', phone: '+51' },
  { code: 'PH', name: 'Philippinen', flag: '🇵🇭', phone: '+63' },
  { code: 'PL', name: 'Polen', flag: '🇵🇱', phone: '+48' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phone: '+351' },
  { code: 'RW', name: 'Ruanda', flag: '🇷🇼', phone: '+250' },
  { code: 'RO', name: 'Rumänien', flag: '🇷🇴', phone: '+40' },
  { code: 'RU', name: 'Russland', flag: '🇷🇺', phone: '+7' },
  { code: 'SB', name: 'Salomonen', flag: '🇸🇧', phone: '+677' },
  { code: 'ZM', name: 'Sambia', flag: '🇿🇲', phone: '+260' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', phone: '+685' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', phone: '+378' },
  { code: 'ST', name: 'São Tomé und Príncipe', flag: '🇸🇹', phone: '+239' },
  { code: 'SA', name: 'Saudi-Arabien', flag: '🇸🇦', phone: '+966' },
  { code: 'SE', name: 'Schweden', flag: '🇸🇪', phone: '+46' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', phone: '+221' },
  { code: 'RS', name: 'Serbien', flag: '🇷🇸', phone: '+381' },
  { code: 'SC', name: 'Seychellen', flag: '🇸🇨', phone: '+248' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', phone: '+232' },
  { code: 'ZW', name: 'Simbabwe', flag: '🇿🇼', phone: '+263' },
  { code: 'SG', name: 'Singapur', flag: '🇸🇬', phone: '+65' },
  { code: 'SK', name: 'Slowakei', flag: '🇸🇰', phone: '+421' },
  { code: 'SI', name: 'Slowenien', flag: '🇸🇮', phone: '+386' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', phone: '+252' },
  { code: 'ES', name: 'Spanien', flag: '🇪🇸', phone: '+34' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', phone: '+94' },
  { code: 'KN', name: 'St. Kitts und Nevis', flag: '🇰🇳', phone: '+1' },
  { code: 'LC', name: 'St. Lucia', flag: '🇱🇨', phone: '+1' },
  { code: 'VC', name: 'St. Vincent und die Grenadinen', flag: '🇻🇨', phone: '+1' },
  { code: 'ZA', name: 'Südafrika', flag: '🇿🇦', phone: '+27' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', phone: '+249' },
  { code: 'KR', name: 'Südkorea', flag: '🇰🇷', phone: '+82' },
  { code: 'SS', name: 'Südsudan', flag: '🇸🇸', phone: '+211' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', phone: '+597' },
  { code: 'SY', name: 'Syrien', flag: '🇸🇾', phone: '+963' },
  { code: 'TJ', name: 'Tadschikistan', flag: '🇹🇯', phone: '+992' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', phone: '+886' },
  { code: 'TZ', name: 'Tansania', flag: '🇹🇿', phone: '+255' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', phone: '+66' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱', phone: '+670' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', phone: '+228' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', phone: '+676' },
  { code: 'TT', name: 'Trinidad und Tobago', flag: '🇹🇹', phone: '+1' },
  { code: 'TD', name: 'Tschad', flag: '🇹🇩', phone: '+235' },
  { code: 'CZ', name: 'Tschechien', flag: '🇨🇿', phone: '+420' },
  { code: 'TN', name: 'Tunesien', flag: '🇹🇳', phone: '+216' },
  { code: 'TR', name: 'Türkei', flag: '🇹🇷', phone: '+90' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', phone: '+993' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', phone: '+688' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', phone: '+256' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', phone: '+380' },
  { code: 'HU', name: 'Ungarn', flag: '🇭🇺', phone: '+36' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', phone: '+598' },
  { code: 'UZ', name: 'Usbekistan', flag: '🇺🇿', phone: '+998' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', phone: '+678' },
  { code: 'VA', name: 'Vatikanstadt', flag: '🇻🇦', phone: '+39' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', phone: '+58' },
  { code: 'AE', name: 'Vereinigte Arabische Emirate', flag: '🇦🇪', phone: '+971' },
  { code: 'US', name: 'Vereinigte Staaten', flag: '🇺🇸', phone: '+1' },
  { code: 'GB', name: 'Vereinigtes Königreich', flag: '🇬🇧', phone: '+44' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', phone: '+84' },
  { code: 'CF', name: 'Zentralafrikanische Republik', flag: '🇨🇫', phone: '+236' },
  { code: 'CY', name: 'Zypern', flag: '🇨🇾', phone: '+357' },
];

/** Number of DACH countries (for separator in UI) */
export const DACH_COUNT = 3;

/**
 * Get a country by its ISO code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

/**
 * Get display label for a country: "🇩🇪 Deutschland"
 */
export function getCountryLabel(code: string): string {
  const country = getCountryByCode(code);
  if (!country) return code;
  return `${country.flag} ${country.name}`;
}

/**
 * Get phone codes list (unique, sorted by DACH first)
 */
export function getPhoneCodes(): { code: string; label: string; country: string }[] {
  // Deduplicate by phone prefix, keeping first occurrence (DACH first)
  const seen = new Set<string>();
  const result: { code: string; label: string; country: string }[] = [];
  
  for (const c of COUNTRIES) {
    if (!seen.has(c.phone)) {
      seen.add(c.phone);
      result.push({
        code: c.phone,
        label: `${c.flag} ${c.phone}`,
        country: c.code,
      });
    }
  }
  return result;
}
