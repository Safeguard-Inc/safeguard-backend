/**
 * jurisdiction.ts
 *
 * ISO 3166-1 numeric and alpha-2 country code registry for cross-border Stellar compliance.
 */

export interface JurisdictionInfo {
  numericCode: number;
  alpha2: string;
  alpha3: string;
  name: string;
  flag: string;
  isHighRisk?: boolean;
}

export const JURISDICTIONS: Record<number, JurisdictionInfo> = {
  840: { numericCode: 840, alpha2: 'US', alpha3: 'USA', name: 'United States', flag: '🇺🇸' },
  826: { numericCode: 826, alpha2: 'GB', alpha3: 'GBR', name: 'United Kingdom', flag: '🇬🇧' },
  276: { numericCode: 276, alpha2: 'DE', alpha3: 'DEU', name: 'Germany', flag: '🇩🇪' },
  250: { numericCode: 250, alpha2: 'FR', alpha3: 'FRA', name: 'France', flag: '🇫🇷' },
  392: { numericCode: 392, alpha2: 'JP', alpha3: 'JPN', name: 'Japan', flag: '🇯🇵' },
  756: { numericCode: 756, alpha2: 'CH', alpha3: 'CHE', name: 'Switzerland', flag: '🇨🇭' },
  702: { numericCode: 702, alpha2: 'SG', alpha3: 'SGP', name: 'Singapore', flag: '🇸🇬' },
  124: { numericCode: 124, alpha2: 'CA', alpha3: 'CAN', name: 'Canada', flag: '🇨🇦' },
  36: { numericCode: 36, alpha2: 'AU', alpha3: 'AUS', name: 'Australia', flag: '🇦🇺' },
  784: { numericCode: 784, alpha2: 'AE', alpha3: 'ARE', name: 'United Arab Emirates', flag: '🇦🇪' },
  566: { numericCode: 566, alpha2: 'NG', alpha3: 'NGA', name: 'Nigeria', flag: '🇳🇬' },
  710: { numericCode: 710, alpha2: 'ZA', alpha3: 'ZAF', name: 'South Africa', flag: '🇿🇦' },
  76: { numericCode: 76, alpha2: 'BR', alpha3: 'BRA', name: 'Brazil', flag: '🇧🇷' },
  // High risk / sanctioned jurisdictions for compliance testing
  408: { numericCode: 408, alpha2: 'KP', alpha3: 'PRK', name: 'North Korea', flag: '🇰🇵', isHighRisk: true },
  364: { numericCode: 364, alpha2: 'IR', alpha3: 'IRN', name: 'Iran', flag: '🇮🇷', isHighRisk: true },
};

export function getJurisdictionByNumeric(numericCode: number): JurisdictionInfo | undefined {
  return JURISDICTIONS[numericCode];
}

export function getJurisdictionByAlpha2(alpha2: string): JurisdictionInfo | undefined {
  const upper = alpha2.trim().toUpperCase();
  return Object.values(JURISDICTIONS).find((j) => j.alpha2 === upper);
}

export function formatJurisdictionString(numericCode: number): string {
  const j = getJurisdictionByNumeric(numericCode);
  if (!j) return `Jurisdiction #${numericCode}`;
  return `${j.flag} ${j.name} (${j.alpha2})`;
}
