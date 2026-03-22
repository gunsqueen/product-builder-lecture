import { buildSearchKeywords, normalizeSearchKeyword } from '../utils/searchNormalizer'
import type { SearchRegionResult } from '../types/search'
import { getAllCities, getAllProvinces, getAllTowns, getCityByCode, getProvinceByCode } from '../utils/adminLookup'

const SEARCH_INDEX: SearchRegionResult[] = [
  ...getAllProvinces().map((province) => ({
    adminCode: province.adminCode,
    adminLevel: 'province' as const,
    name: province.name,
    provinceCode: province.adminCode,
    route: `/province/${province.adminCode}`,
    keywords: buildSearchKeywords(province.name),
  })),
  ...getAllCities().map((city) => ({
    adminCode: city.adminCode,
    adminLevel: 'city' as const,
    name: city.name,
    parentName: getProvinceByCode(city.provinceCode)?.name,
    provinceCode: city.provinceCode,
    cityCode: city.adminCode,
    route: `/province/${city.provinceCode}/city/${city.adminCode}`,
    keywords: buildSearchKeywords(city.name, getProvinceByCode(city.provinceCode)?.name),
  })),
  ...getAllTowns().map((town) => ({
    adminCode: town.adminCode,
    adminLevel: 'town' as const,
    name: town.name,
    parentName: `${getProvinceByCode(town.provinceCode)?.name ?? ''} ${getCityByCode(town.cityCode)?.name ?? ''}`.trim(),
    provinceCode: town.provinceCode,
    cityCode: town.cityCode,
    townCode: town.adminCode,
    route: `/province/${town.provinceCode}/city/${town.cityCode}/town/${town.adminCode}`,
    keywords: buildSearchKeywords(
      town.name,
      `${getProvinceByCode(town.provinceCode)?.name ?? ''} ${getCityByCode(town.cityCode)?.name ?? ''}`.trim(),
    ),
  })),
]

export const searchRegions = (keyword: string, allowedLevels?: Array<SearchRegionResult['adminLevel']>) => {
  const normalized = normalizeSearchKeyword(keyword)
  if (!normalized) return []

  const results = SEARCH_INDEX.filter((item) => {
    if (allowedLevels && !allowedLevels.includes(item.adminLevel)) return false
    return item.keywords.some((entry) => entry.includes(normalized))
  }).slice(0, 12)

  if (import.meta.env.DEV) {
    console.log('[search:regions]', {
      keyword,
      normalizedKeyword: normalized,
      allowedLevels: allowedLevels ?? 'all',
      resultCount: results.length,
      sample: results.slice(0, 3).map((item) => ({
        adminCode: item.adminCode,
        adminLevel: item.adminLevel,
        name: item.name,
      })),
    })
  }

  return results
}

export const getRegionByAdminCode = (adminCode: string) => SEARCH_INDEX.find((item) => item.adminCode === adminCode)

export const getRegionLabel = (region: SearchRegionResult) => {
  if (region.adminLevel === 'province') return region.name
  if (region.adminLevel === 'city') return `${region.name} (${getProvinceByCode(region.provinceCode)?.name ?? region.parentName ?? ''})`
  const city = region.cityCode ? getCityByCode(region.cityCode) : undefined
  return `${region.name} (${getProvinceByCode(region.provinceCode)?.name ?? ''} ${city?.name ?? ''})`.trim()
}
