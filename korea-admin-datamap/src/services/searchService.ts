import {
  listAllProvinceMasters,
  listAllTownMasters,
  listDisplayCityMasters,
} from '@/services/adminDataService'
import type { RegionSearchResult } from '@/types/search'
import {
  createCitySearchResult,
  createProvinceSearchResult,
  createTownSearchResult,
  filterSearchResults,
} from '@/utils/searchNormalizer'

const provinceCatalog = listAllProvinceMasters()
const cityCatalog = listDisplayCityMasters()
const townCatalog = listAllTownMasters()

const provinceNameLookup = Object.fromEntries(
  provinceCatalog.map((province) => [province.code, province.name]),
)
const cityNameLookup = Object.fromEntries(
  cityCatalog.map((city) => [city.code, city.name]),
)

const provinceSearchIndex = provinceCatalog.map((province) =>
  createProvinceSearchResult(province),
)
const citySearchIndex = cityCatalog.map((city) =>
  createCitySearchResult(city, provinceNameLookup[city.provinceCode]),
)
const townSearchIndex = townCatalog.map((town) =>
  createTownSearchResult(town, cityNameLookup[town.cityCode]),
)

const limitSearchResults = (results: RegionSearchResult[], limit = 10) =>
  results.slice(0, limit)

const regionSearchIndex = [...provinceSearchIndex, ...citySearchIndex, ...townSearchIndex]

export const searchProvince = async (keyword: string) =>
  limitSearchResults(filterSearchResults(provinceSearchIndex, keyword, 'province'))

export const searchCity = async (keyword: string) =>
  limitSearchResults(filterSearchResults(citySearchIndex, keyword, 'city'))

export const searchTown = async (keyword: string) =>
  limitSearchResults(filterSearchResults(townSearchIndex, keyword, 'town'))

export const searchRegions = async (keyword: string) =>
  limitSearchResults(
    filterSearchResults(
      regionSearchIndex,
      keyword,
    ),
  )

export const getRegionSearchResultByCode = async (adminCode: string) =>
  regionSearchIndex.find((result) => result.adminCode === adminCode) ?? null
