import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

export interface CountryPhoneCode {
  country: string
  countryCode: string
  mobileCode: string
}

export const getCountryPhoneCodes = (): CountryPhoneCode[] => {
  const seen = new Set<string>()

  return getCountries()
    .map((code) => {
      const displayName = new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code
      const phoneCode = getCountryCallingCode(code)
      return {
        country: displayName,
        countryCode: code,
        mobileCode: phoneCode,
      }
    })
    .filter((item) => {
      if (seen.has(item.mobileCode)) return false
      seen.add(item.mobileCode)
      return true
    })
    .sort((a, b) => parseInt(a.mobileCode) - parseInt(b.mobileCode))
}
