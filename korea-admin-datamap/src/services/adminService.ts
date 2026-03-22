import provincesData from '@/data/admin/provinces.json'
import citiesData from '@/data/admin/cities.json'
import townsData from '@/data/admin/towns.json'
import legacyTownAliasesData from '@/data/admin/legacyTownAliases.json'
import adminDongLegalMappingsData from '@/data/admin/adminDongLegalMappings.json'
import type {
  AdminDongLegalMappingRecord,
  CityCode,
  CityDistrict,
  CityMasterRecord,
  Province,
  ProvinceCode,
  ProvinceMasterRecord,
  Town,
  TownCode,
  TownMasterRecord,
} from '@/types/admin'

const normalizeCityName = (value: string) => value.trim()
const normalizeTownName = (value: string) => value.trim()
const normalizeShortName = (value: string) => value.trim()
const normalizeCityAdminType = (
  adminType: CityMasterRecord['adminType'],
  name: string,
): CityMasterRecord['adminType'] => (name.endsWith('구') ? 'district' : adminType)

const provinceCatalog = (provincesData as ProvinceMasterRecord[]).map((record) => ({
  code: record.provinceCode,
  name: record.name,
  shortName: record.shortName,
  slug: record.slug,
  capital: record.capital,
  center: record.center,
  populationRank: record.populationRank,
  cityCount: record.cityCount,
  description: record.description,
})) satisfies Province[]

const townMasterRecords = townsData as TownMasterRecord[]
const townCountByCityCode = new Map<string, number>()
for (const record of townMasterRecords) {
  townCountByCityCode.set(record.cityCode, (townCountByCityCode.get(record.cityCode) ?? 0) + 1)
}

const cityCatalog = (citiesData as CityMasterRecord[]).map((record) => ({
  code: record.cityCode,
  provinceCode: record.provinceCode,
  name: normalizeCityName(record.name),
  shortName: normalizeShortName(record.shortName),
  slug: record.slug,
  adminType: normalizeCityAdminType(record.adminType, normalizeCityName(record.name)),
  center: record.center,
  townCount: townCountByCityCode.get(record.cityCode) ?? record.townCount,
  hasBoundary: record.hasBoundary,
})) satisfies CityDistrict[]

const townCatalog = townMasterRecords.map((record) => ({
  code: record.townCode,
  adminDongCode: record.adminDongCode ?? record.townCode,
  provinceCode: record.provinceCode,
  cityCode: record.cityCode,
  legalDongCode: record.legalDongCode,
  legalDongCodes: record.legalDongCodes,
  name: normalizeTownName(record.name),
  shortName: normalizeShortName(record.shortName),
  slug: record.slug,
  townType: record.townType,
  center: record.center,
  hasBoundary: record.hasBoundary,
})) satisfies Town[]

const legacyTownAliases = (legacyTownAliasesData as TownMasterRecord[]).map((record) => ({
  code: record.townCode,
  adminDongCode: record.adminDongCode ?? record.townCode,
  provinceCode: record.provinceCode,
  cityCode: record.cityCode,
  legalDongCode: record.legalDongCode,
  legalDongCodes: record.legalDongCodes,
  name: normalizeTownName(record.name),
  shortName: normalizeShortName(record.shortName),
  slug: record.slug,
  townType: record.townType,
  center: record.center,
  hasBoundary: record.hasBoundary,
})) satisfies Town[]

const adminDongLegalMappings =
  adminDongLegalMappingsData as AdminDongLegalMappingRecord[]

const provinceLookup = Object.fromEntries(
  provinceCatalog.map((province) => [province.code, province]),
) as Record<ProvinceCode, Province>

const cityLookup = Object.fromEntries(
  cityCatalog.map((city) => [city.code, city]),
) as Record<CityCode, CityDistrict>

const townLookup = Object.fromEntries(
  townCatalog.map((town) => [town.code, town]),
) as Record<TownCode, Town>

export const getProvinceCatalog = () => provinceCatalog
export const getCityCatalog = () => cityCatalog
export const getTownCatalog = () => townCatalog
export const getAdminDongLegalMappings = () => adminDongLegalMappings

export const loadProvinces = async () => provinceCatalog

export const loadProvinceByCode = async (provinceCode: ProvinceCode) =>
  provinceLookup[provinceCode] ?? null

export const loadCities = async (provinceCode?: ProvinceCode) =>
  provinceCode
    ? cityCatalog.filter((city) => city.provinceCode === provinceCode)
    : cityCatalog

export const loadCityByCode = async (cityCode: CityCode) => cityLookup[cityCode] ?? null

export const loadTowns = async (cityCode?: CityCode) =>
  cityCode ? townCatalog.filter((town) => town.cityCode === cityCode) : townCatalog

export const loadTownByCode = async (townCode: TownCode) => townLookup[townCode] ?? null
export const loadLegacyTownAliasByCode = async (townCode: TownCode) =>
  legacyTownAliases.find((town) => town.code === townCode) ?? null

export const loadAdminDongLegalMappingsByCode = async (townCode: TownCode) =>
  adminDongLegalMappings.filter((mapping) => mapping.adminDongCode === townCode)
