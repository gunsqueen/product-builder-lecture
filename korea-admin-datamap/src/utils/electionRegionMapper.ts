import {
  getCityCatalog,
  getProvinceCatalog,
  getTownCatalog,
} from '@/services/adminService'
import type { AdminCode, AdminLevel } from '@/types/admin'
import { createAdminAreaNameAliases, normalizeAdminAreaName } from '@/utils/adminName'

interface ElectionRegionMappingInput {
  adminLevel?: AdminLevel
  regionName?: string | null
  provinceName?: string | null
  cityName?: string | null
  townName?: string | null
}

const provinceCatalog = getProvinceCatalog()
const cityCatalog = getCityCatalog()
const townCatalog = getTownCatalog()

const normalizeName = (value?: string | null) => normalizeAdminAreaName(value)

const stripConstituencySuffix = (value: string) =>
  value.replace(/(갑|을|병|정|무|기타|선거구)$/g, '')

const createRegionNameCandidates = (value?: string | null) => {
  const normalized = normalizeName(value)

  if (!normalized) {
    return []
  }

  const provinceStripped = provinceCatalog.reduce<string[]>((accumulator, province) => {
    const aliases = createAdminAreaNameAliases(province.name)
      .concat(createAdminAreaNameAliases(province.shortName))
      .map((alias) => normalizeName(alias))
      .filter(Boolean)

    aliases.forEach((alias) => {
      if (normalized.startsWith(alias)) {
        accumulator.push(normalized.slice(alias.length))
      }
    })

    return accumulator
  }, [])

  return [
    normalized,
    stripConstituencySuffix(normalized),
    ...provinceStripped,
    ...provinceStripped.map(stripConstituencySuffix),
  ].filter(Boolean)
}

const createCityAliasCandidates = (cityCode: string) => {
  const city = cityCatalog.find((item) => item.code === cityCode)
  const province = provinceCatalog.find((item) => item.code === city?.provinceCode)

  if (!city) {
    return []
  }

  const aliases = [
    ...createAdminAreaNameAliases(city.name),
    ...createAdminAreaNameAliases(city.shortName),
  ]

  if (province) {
    aliases.push(
      ...createAdminAreaNameAliases(`${province.name} ${city.name}`),
      ...createAdminAreaNameAliases(`${province.shortName} ${city.name}`),
      ...createAdminAreaNameAliases(`${province.name} ${city.shortName}`),
      ...createAdminAreaNameAliases(`${province.shortName} ${city.shortName}`),
    )
  }

  return [...new Set(aliases.map((alias) => normalizeName(alias)).filter(Boolean))].flatMap(
    (alias) => [alias, stripConstituencySuffix(alias)],
  )
}

const createTownAliasCandidates = (townCode: string) => {
  const town = townCatalog.find((item) => item.code === townCode)
  const city = cityCatalog.find((item) => item.code === town?.cityCode)

  if (!town) {
    return []
  }

  const aliases = [
    ...createAdminAreaNameAliases(town.name),
    ...createAdminAreaNameAliases(town.shortName),
  ]

  if (city) {
    aliases.push(
      ...createAdminAreaNameAliases(`${city.name} ${town.name}`),
      ...createAdminAreaNameAliases(`${city.shortName} ${town.name}`),
    )
  }

  return [...new Set(aliases.map((alias) => normalizeName(alias)).filter(Boolean))]
}

export const mapElectionRegionToAdminCode = ({
  adminLevel,
  regionName,
  provinceName,
  cityName,
  townName,
}: ElectionRegionMappingInput): AdminCode | null => {
  const regionCandidates = createRegionNameCandidates(regionName)
  const provinceCandidates = createRegionNameCandidates(provinceName)
  const cityCandidates = createRegionNameCandidates(cityName)
  const townCandidates = createRegionNameCandidates(townName)

  if (adminLevel === 'province') {
    const province = provinceCatalog.find((item) => {
      const aliases = [
        ...createAdminAreaNameAliases(item.name),
        ...createAdminAreaNameAliases(item.shortName),
      ].map((alias) => normalizeName(alias))

      return regionCandidates.some((candidate) => aliases.includes(candidate))
    })

    return province?.code ?? null
  }

  if (adminLevel === 'city') {
    const city = cityCatalog.find((item) => {
      const aliases = createCityAliasCandidates(item.code)
      const cityNameMatch =
        regionCandidates.some((candidate) => aliases.includes(candidate)) ||
        cityCandidates.some((candidate) => aliases.includes(candidate))

      const provinceMatch = provinceCandidates.length
        ? provinceCandidates.some(
            (candidate) =>
              normalizeName(
                provinceCatalog.find((province) => province.code === item.provinceCode)?.name,
              ) === candidate,
          )
        : true

      return cityNameMatch && provinceMatch
    })

    return city?.code ?? null
  }

  if (adminLevel === 'town') {
    const town = townCatalog.find((item) => {
      const aliases = createTownAliasCandidates(item.code)
      const townNameMatch =
        regionCandidates.some((candidate) => aliases.includes(candidate)) ||
        townCandidates.some((candidate) => aliases.includes(candidate))

      const cityMatch = cityCandidates.length
        ? cityCandidates.some(
            (candidate) =>
              createCityAliasCandidates(item.cityCode).includes(candidate),
          )
        : true

      return townNameMatch && cityMatch
    })

    return town?.code ?? null
  }

  const fallbackProvince = provinceCatalog.find((item) => {
    const aliases = [
      ...createAdminAreaNameAliases(item.name),
      ...createAdminAreaNameAliases(item.shortName),
    ].map((alias) => normalizeName(alias))

    return regionCandidates.some((candidate) => aliases.includes(candidate))
  })
  if (fallbackProvince) {
    return fallbackProvince.code
  }

  const fallbackCity = cityCatalog.find((item) =>
    regionCandidates.some((candidate) => createCityAliasCandidates(item.code).includes(candidate)),
  )
  if (fallbackCity) {
    return fallbackCity.code
  }

  const fallbackTown = townCatalog.find((item) =>
    regionCandidates.some((candidate) => createTownAliasCandidates(item.code).includes(candidate)),
  )

  return fallbackTown?.code ?? null
}

export const logElectionRegionMappingFailure = (
  input: ElectionRegionMappingInput,
) => {
  if (!import.meta.env.DEV) {
    return
  }

  console.groupCollapsed('[election-region-mapper] failed to map region')
  console.info('input:', input)
  console.groupEnd()
}
