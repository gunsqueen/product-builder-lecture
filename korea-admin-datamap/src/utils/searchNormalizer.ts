import type { AdminLevel, CityDistrict, Province, Town } from '@/types/admin'
import type { RegionSearchResult } from '@/types/search'
import { normalizeAdminAreaName } from '@/utils/adminName'

interface SearchScoreInput {
  keyword: string
  name: string
  parentName?: string
}

const normalizeText = (value: string) =>
  normalizeAdminAreaName(value).toLowerCase()

export const normalizeSearchKeyword = (keyword: string) => normalizeText(keyword)

const getSearchScore = ({ keyword, name, parentName }: SearchScoreInput) => {
  const normalizedKeyword = normalizeText(keyword)
  const normalizedName = normalizeText(name)
  const normalizedParentName = normalizeText(parentName ?? '')

  if (!normalizedKeyword) {
    return Number.MAX_SAFE_INTEGER
  }

  if (normalizedName === normalizedKeyword) {
    return 0
  }

  if (normalizedName.startsWith(normalizedKeyword)) {
    return 1
  }

  if (normalizedName.includes(normalizedKeyword)) {
    return 2
  }

  if (normalizedParentName.includes(normalizedKeyword)) {
    return 3
  }

  return 4
}

export const createProvinceSearchResult = (province: Province): RegionSearchResult => ({
  adminCode: province.code,
  adminLevel: 'province',
  name: province.name,
  provinceCode: province.code,
})

export const createCitySearchResult = (
  city: CityDistrict,
  provinceName?: string,
): RegionSearchResult => ({
  adminCode: city.code,
  adminLevel: 'city',
  name: city.name,
  parentName: provinceName,
  provinceCode: city.provinceCode,
  cityCode: city.code,
})

export const createTownSearchResult = (
  town: Town,
  cityName?: string,
): RegionSearchResult => ({
  adminCode: town.code,
  adminLevel: 'town',
  name: town.name,
  parentName: cityName,
  provinceCode: town.provinceCode,
  cityCode: town.cityCode,
  townCode: town.code,
})

export const dedupeSearchResults = (results: RegionSearchResult[]) =>
  Object.values(
    results.reduce<Record<string, RegionSearchResult>>((lookup, result) => {
      lookup[result.adminCode] = result
      return lookup
    }, {}),
  )

export const filterSearchResults = (
  results: RegionSearchResult[],
  keyword: string,
  level?: AdminLevel,
) => {
  const normalizedKeyword = normalizeSearchKeyword(keyword)

  return dedupeSearchResults(results)
    .filter((result) => {
      if (level && result.adminLevel !== level) {
        return false
      }

      const normalizedName = normalizeText(result.name)
      const normalizedParentName = normalizeText(result.parentName ?? '')

      return (
        normalizedName.includes(normalizedKeyword) ||
        normalizedParentName.includes(normalizedKeyword)
      )
    })
    .sort((left, right) => {
      const leftScore = getSearchScore({
        keyword,
        name: left.name,
        parentName: left.parentName,
      })
      const rightScore = getSearchScore({
        keyword,
        name: right.name,
        parentName: right.parentName,
      })

      if (leftScore !== rightScore) {
        return leftScore - rightScore
      }

      return left.name.localeCompare(right.name, 'ko')
    })
}
