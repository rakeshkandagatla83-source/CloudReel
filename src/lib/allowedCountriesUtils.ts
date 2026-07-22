export function parseAllowedCountries(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(c => c.length > 0)
}

export function serializeAllowedCountries(codes: string[]): string | null {
  const unique = Array.from(
    new Set(codes.map(c => c.trim().toUpperCase()).filter(c => c.length > 0)),
  )
  if (unique.length === 0) return null
  return ',' + unique.join(',') + ','
}

export function isCountryAllowed(allowedCountriesCsv: string | null | undefined, countryCode: string): boolean {
  if (!allowedCountriesCsv) return true
  const allowed = parseAllowedCountries(allowedCountriesCsv)
  return allowed.includes(countryCode.toUpperCase())
}
