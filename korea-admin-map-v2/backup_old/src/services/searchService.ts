import { getAllRegions } from './adminService'
import { uniqueSearchResults } from '../utils/searchNormalizer'
import type { SearchResultItem } from '../types/search'

export const searchRegions = (keyword: string): SearchResultItem[] => {
  const term = keyword.trim()
  if (!term) return []
  const { provinces, cities, towns } = getAllRegions()
  return uniqueSearchResults([
    ...provinces
      .filter((item) => item.name.includes(term) || item.shortName.includes(term))
      .map((item) => ({
        adminCode: item.provinceCode,
        adminLevel: 'province' as const,
        name: item.name,
        parentName: '대한민국',
        provinceCode: item.provinceCode,
      })),
    ...cities
      .filter((item) => item.name.includes(term) || item.shortName.includes(term))
      .map((item) => ({
        adminCode: item.cityCode,
        adminLevel: 'city' as const,
        name: item.name,
        parentName: provinces.find((province) => province.provinceCode === item.provinceCode)?.name ?? '',
        provinceCode: item.provinceCode,
        cityCode: item.cityCode,
      })),
    ...towns
      .filter((item) => item.name.includes(term) || item.shortName.includes(term))
      .map((item) => ({
        adminCode: item.townCode,
        adminLevel: 'town' as const,
        name: item.name,
        parentName: cities.find((city) => city.cityCode === item.cityCode)?.name ?? '',
        provinceCode: item.provinceCode,
        cityCode: item.cityCode,
        townCode: item.townCode,
      })),
  ]).slice(0, 20)
}
