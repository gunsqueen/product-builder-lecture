import type {
  AdminCode,
  AdminLevel,
  CityCode,
  CityDistrict,
  LegalDongCode,
  Province,
  ProvinceCode,
  Town,
} from '@/types/admin'

export const normalizeAdminCode = (code: string) => code.trim()

export const isProvinceCode = (code: string) => normalizeAdminCode(code).length === 2

export const isCityCode = (code: string) => normalizeAdminCode(code).length === 5

export const isTownCode = (code: string) => normalizeAdminCode(code).length >= 8

export const isLegalDongCode = (code: string) =>
  normalizeAdminCode(code).length === 10

export const isValidProvinceCode = (code: string) => /^\d{2}$/.test(code)

export const isValidCityCode = (code: string) => /^\d{5}$/.test(code)

export const isValidTownCode = (code: string) => /^\d{8,10}$/.test(code)

export const isValidLegalDongCode = (code: string) => /^\d{10}$/.test(code)

export const getProvinceCodeFromCity = (cityCode: string) =>
  normalizeAdminCode(cityCode).slice(0, 2) as ProvinceCode

export const getCityCodeFromTown = (townCode: string) =>
  normalizeAdminCode(townCode).slice(0, 5) as CityCode

export const getCityCodeFromLegalDong = (legalDongCode: string) =>
  normalizeAdminCode(legalDongCode).slice(0, 5) as CityCode

export const getProvinceCodeFromAdminCode = (code: AdminCode) =>
  normalizeAdminCode(code).slice(0, 2) as ProvinceCode

export const getParentAdminCode = (code: string) => {
  if (isLegalDongCode(code)) {
    return getCityCodeFromLegalDong(code)
  }

  if (isTownCode(code)) {
    return getCityCodeFromTown(code)
  }

  if (isCityCode(code)) {
    return getProvinceCodeFromCity(code)
  }

  return null
}

export const getAdminLevelFromCode = (
  code: AdminCode | LegalDongCode,
): AdminLevel =>
  isProvinceCode(code) ? 'province' : isCityCode(code) ? 'city' : 'town'

export const toProvinceCode = (code: string) =>
  isValidProvinceCode(code) ? (normalizeAdminCode(code) as ProvinceCode) : null

export const toCityCode = (code: string) =>
  isValidCityCode(code) ? (normalizeAdminCode(code) as CityCode) : null

export const toTownCode = (code: string) =>
  isValidTownCode(code) ? normalizeAdminCode(code) : null

export const toLegalDongCode = (code: string) =>
  isValidLegalDongCode(code) ? (normalizeAdminCode(code) as LegalDongCode) : null

export const belongsToProvince = (cityCode: string, provinceCode: string) =>
  getProvinceCodeFromCity(cityCode) === normalizeAdminCode(provinceCode)

export const belongsToCity = (townCode: string, cityCode: string) =>
  getCityCodeFromTown(townCode) === normalizeAdminCode(cityCode)

export const indexByCode = <T extends { code: string }>(items: T[]) =>
  Object.fromEntries(items.map((item) => [item.code, item]))

export const assertProvinceExists = (
  provinceCode: string,
  provinces: Province[],
) => provinces.some((province) => province.code === provinceCode)

export const assertCityExists = (cityCode: string, cities: CityDistrict[]) =>
  cities.some((city) => city.code === cityCode)

export const assertTownExists = (townCode: string, towns: Town[]) =>
  towns.some((town) => town.code === townCode)

export const createCodeLookup = <T extends { code: string }, TValue = T>(
  items: T[],
  selector?: (item: T) => TValue,
) =>
  Object.fromEntries(
    items.map((item) => [item.code, selector ? selector(item) : item]),
  ) as Record<T['code'], TValue>

export const createAdminCodeLookup = <
  T extends { adminCode: string },
  TValue = T,
>(
  items: T[],
  selector?: (item: T) => TValue,
) =>
  Object.fromEntries(
    items.map((item) => [item.adminCode, selector ? selector(item) : item]),
  ) as Record<T['adminCode'], TValue>
