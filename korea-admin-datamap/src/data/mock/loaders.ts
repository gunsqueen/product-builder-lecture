import { mockElectionResults } from '@/data/mock/elections'
import { mockPopulationStats } from '@/data/mock/population'
import legacyTownAliasesData from '@/data/admin/legacyTownAliases.json'
import {
  getCityCatalog,
  getProvinceCatalog,
  getTownCatalog,
} from '@/services/adminService'
import type {
  AdminCode,
  AdminLevel,
  CityCode,
  CityDistrict,
  Province,
  ProvinceCode,
  Town,
  TownCode,
} from '@/types/admin'
import type { ElectionResult } from '@/types/election'
import type { RawElectionInput } from '@/types/election'
import type { PopulationStats, RawPopulationInput } from '@/types/population'
import { getAdminLevelFromCode, getCityCodeFromTown } from '@/utils/adminCode'
import {
  getTopElectionResult,
  normalizeElectionCollection,
} from '@/utils/electionNormalizer'
import { normalizePopulationCollection } from '@/utils/populationNormalizer'

const provinceCatalog = getProvinceCatalog()
const cityCatalog = getCityCatalog()
const townCatalog = getTownCatalog()
const legacyTownAliases = legacyTownAliasesData as Array<{ townCode: string }>

const provinceLookup = Object.fromEntries(
  provinceCatalog.map((province) => [province.code, province]),
) as Record<ProvinceCode, Province>

const cityLookup = Object.fromEntries(
  cityCatalog.map((city) => [city.code, city]),
) as Record<CityCode, CityDistrict>

const townLookup = Object.fromEntries(
  townCatalog.map((town) => [town.code, town]),
) as Record<TownCode, Town>

const buildDerivedCityPopulationStats = (): RawPopulationInput[] => {
  const existingCityCodes = new Set(
    mockPopulationStats
      .filter((record) => record.level === 'city')
      .map((record) => record.adminCode),
  )

  return cityCatalog
    .filter((city) => !existingCityCodes.has(city.code))
    .map((city) => {
      const suffixSeed = Number(city.code.slice(-2))
      const basePerTown =
        city.adminType === 'city'
          ? 18000
          : city.adminType === 'special'
            ? 14000
            : city.adminType === 'county'
              ? 9000
              : 11000
      const totalPopulation = city.townCount * basePerTown + suffixSeed * 3500
      const seniorWeight =
        0.12 +
        (city.adminType === 'county' ? 0.06 : 0) +
        (city.adminType === 'district' ? 0.02 : 0) +
        (suffixSeed % 9) / 100

      return {
        adminCode: city.code,
        adminLevel: 'city',
        totalPopulation,
        householdCount: Math.round(totalPopulation * 0.43),
        malePopulation: Math.round(totalPopulation * 0.49),
        femalePopulation: Math.round(totalPopulation * 0.51),
        age0to9: Math.round(totalPopulation * 0.08),
        age10to19: Math.round(totalPopulation * 0.1),
        age20to29: Math.round(totalPopulation * 0.14),
        age30to39: Math.round(totalPopulation * 0.16),
        age40to49: Math.round(totalPopulation * 0.16),
        age50to59: Math.round(totalPopulation * 0.15),
        age60to64: Math.round(totalPopulation * 0.08),
        age65plus: Math.round(totalPopulation * seniorWeight),
        sourceDate: '2026-01-01',
      }
    })
}

const buildDerivedTownPopulationStats = (): RawPopulationInput[] => {
  const existingTownCodes = new Set(
    mockPopulationStats
      .filter((record) => record.level === 'town')
      .map((record) => record.adminCode),
  )

  return townCatalog
    .filter((town) => !existingTownCodes.has(town.code))
    .map((town) => {
      const city = cityLookup[town.cityCode]
      const suffixSeed = Number(town.code.slice(-2))
      const citySeed = Number(town.cityCode.slice(-2))
      const basePopulation =
        town.townType === 'eup'
          ? 12500
          : town.townType === 'myeon'
            ? 5200
            : city?.adminType === 'district'
              ? 13200 + citySeed * 120
              : city?.adminType === 'county'
                ? 6800
                : 14500
      const totalPopulation = basePopulation + suffixSeed * 180
      const seniorWeight =
        0.11 +
        (town.townType === 'myeon' ? 0.07 : 0) +
        (town.townType === 'eup' ? 0.03 : 0) +
        (suffixSeed % 7) / 100

      return {
        adminCode: town.code,
        adminLevel: 'town',
        totalPopulation,
        householdCount: Math.round(totalPopulation * 0.44),
        malePopulation: Math.round(totalPopulation * 0.49),
        femalePopulation: Math.round(totalPopulation * 0.51),
        age0to9: Math.round(totalPopulation * 0.07),
        age10to19: Math.round(totalPopulation * 0.09),
        age20to29: Math.round(totalPopulation * 0.13),
        age30to39: Math.round(totalPopulation * 0.15),
        age40to49: Math.round(totalPopulation * 0.15),
        age50to59: Math.round(totalPopulation * 0.16),
        age60to64: Math.round(totalPopulation * 0.08),
        age65plus: Math.round(totalPopulation * seniorWeight),
        sourceDate: '2026-01-01',
      }
    })
}

const buildDerivedProvincePopulationStats = (): RawPopulationInput[] => {
  const existingProvinceCodes = new Set(
    mockPopulationStats
      .filter((record) => record.level === 'province')
      .map((record) => record.adminCode),
  )

  return provinceCatalog
    .filter((province) => !existingProvinceCodes.has(province.code))
    .map((province) => {
      const suffixSeed = Number(province.code)
      const totalPopulation = 900000 + suffixSeed * 115000
      const seniorWeight = 0.16 + (suffixSeed % 7) / 100

      return {
        adminCode: province.code,
        adminLevel: 'province',
        totalPopulation,
        householdCount: Math.round(totalPopulation * 0.45),
        malePopulation: Math.round(totalPopulation * 0.495),
        femalePopulation: Math.round(totalPopulation * 0.505),
        age0to9: Math.round(totalPopulation * 0.07),
        age10to19: Math.round(totalPopulation * 0.09),
        age20to29: Math.round(totalPopulation * 0.12),
        age30to39: Math.round(totalPopulation * 0.13),
        age40to49: Math.round(totalPopulation * 0.14),
        age50to59: Math.round(totalPopulation * 0.16),
        age60to64: Math.round(totalPopulation * 0.08),
        age65plus: Math.round(totalPopulation * seniorWeight),
        sourceDate: '2026-01-01',
      }
    })
}

const buildMockElectionRows = (
  electionId: string,
  electionName: string,
  regionName: string,
  adminCode: string,
  adminLevel: 'province' | 'city' | 'town',
  turnoutRate: number,
  leadingParty: string,
  leadingShare: number,
  challengerParty: string,
  challengerShare: number,
): RawElectionInput[] => {
  const totalValidVotes = adminLevel === 'province' ? 1200000 : 120000
  const totalVotes = Math.round(totalValidVotes / Math.max(0.1, turnoutRate / 100))

  return [
    {
      electionId,
      electionName,
      electionType:
        adminLevel === 'province'
          ? 'local-governor'
          : adminLevel === 'city'
            ? 'local-mayor'
            : 'local-town',
      electionDate: '2026-06-03',
      regionName,
      adminCode,
      adminLevel,
      candidateName: `${leadingParty} 후보`,
      partyName: leadingParty,
      voteCount: Math.round(totalValidVotes * (leadingShare / 100)),
      voteRate: leadingShare,
      totalValidVotes,
      totalVotes,
      turnoutRate,
      sourceDate: '2026-06-04',
    },
    {
      electionId,
      electionName,
      electionType:
        adminLevel === 'province'
          ? 'local-governor'
          : adminLevel === 'city'
            ? 'local-mayor'
            : 'local-town',
      electionDate: '2026-06-03',
      regionName,
      adminCode,
      adminLevel,
      candidateName: `${challengerParty} 후보`,
      partyName: challengerParty,
      voteCount: Math.round(totalValidVotes * (challengerShare / 100)),
      voteRate: challengerShare,
      totalValidVotes,
      totalVotes,
      turnoutRate,
      sourceDate: '2026-06-04',
    },
  ]
}

const buildDerivedElectionResults = (): RawElectionInput[] => {
  const existingProvinceCodes = new Set(
    mockElectionResults
      .filter((record) => record.adminLevel === 'province')
      .map((record) => record.adminCode),
  )
  const existingCityCodes = new Set(
    mockElectionResults
      .filter((record) => record.adminLevel === 'city')
      .map((record) => record.adminCode),
  )

  const provinceRows = provinceCatalog
    .filter((province) => !existingProvinceCodes.has(province.code))
    .flatMap((province) => {
      const seed = Number(province.code)
      const leadingShare = 46 + (seed % 6)
      const challengerShare = 39 + (seed % 5)
      const turnoutRate = 58 + (seed % 7)

      return buildMockElectionRows(
        '2026-local-governor',
        '2026 지방선거 광역단체장',
        province.name,
        province.code,
        'province',
        turnoutRate,
        seed % 2 === 0 ? '개혁연합' : '미래시민',
        leadingShare,
        seed % 2 === 0 ? '미래시민' : '개혁연합',
        challengerShare,
      )
    })

  const cityRows = cityCatalog
    .filter((city) => !existingCityCodes.has(city.code))
    .flatMap((city) => {
      const seed = Number(city.code.slice(-2))
      const leadingShare = 47 + (seed % 7)
      const challengerShare = 35 + (seed % 8)
      const turnoutRate = 54 + (seed % 11)

      return buildMockElectionRows(
        '2026-local-mayor',
        '2026 지방선거 기초단체장',
        city.name,
        city.code,
        'city',
        turnoutRate,
        seed % 2 === 0 ? '개혁연합' : '미래시민',
        leadingShare,
        seed % 2 === 0 ? '미래시민' : '개혁연합',
        challengerShare,
      )
    })

  const existingTownCodes = new Set(
    mockElectionResults
      .filter((record) => record.adminLevel === 'town')
      .map((record) => record.adminCode),
  )

  const townRows = townCatalog
    .filter((town) => !existingTownCodes.has(town.code))
    .flatMap((town) => {
      const seed = Number(town.code.slice(-2))
      const leadingShare = 45 + (seed % 9)
      const challengerShare = 33 + (seed % 10)
      const turnoutRate = 52 + (seed % 13)

      return buildMockElectionRows(
        '2026-local-town',
        '2026 지방선거 행정동 샘플',
        town.name,
        town.code,
        'town',
        turnoutRate,
        seed % 2 === 0 ? '개혁연합' : '미래시민',
        leadingShare,
        seed % 2 === 0 ? '미래시민' : '개혁연합',
        challengerShare,
      )
    })

  return [...provinceRows, ...cityRows, ...townRows]
}

const validAdminCodes = new Set([
  ...provinceCatalog.map((province) => province.code),
  ...cityCatalog.map((city) => city.code),
  ...townCatalog.map((town) => town.code),
  ...legacyTownAliases.map((town) => town.townCode),
])

const normalizedBaseMockPopulationStats = normalizePopulationCollection(
  mockPopulationStats.map((record) => ({
    adminCode: record.adminCode,
    adminLevel: record.level,
    totalPopulation: record.totalPopulation,
    householdCount: record.householdCount,
    malePopulation: Math.round(record.totalPopulation * 0.49),
    femalePopulation: Math.round(record.totalPopulation * 0.51),
    age0to9: Math.round(record.totalPopulation * 0.07),
    age10to19: Math.round(record.totalPopulation * 0.09),
    age20to29: Math.round(record.totalPopulation * 0.14),
    age30to39: Math.round(record.totalPopulation * 0.15),
    age40to49: Math.round(record.totalPopulation * 0.15),
    age50to59: Math.round(record.totalPopulation * 0.15),
    age60to64: Math.round(record.totalPopulation * 0.07),
    age65plus: Math.round(record.totalPopulation * (record.seniorsRatio / 100)),
    sourceDate: record.updatedAt,
    daytimePopulation: record.daytimePopulation,
  })),
  'mock',
)

const resolvedMockPopulationStats: PopulationStats[] = [
  ...normalizedBaseMockPopulationStats,
  ...normalizePopulationCollection(buildDerivedProvincePopulationStats(), 'mock'),
  ...normalizePopulationCollection(buildDerivedCityPopulationStats(), 'mock'),
  ...normalizePopulationCollection(buildDerivedTownPopulationStats(), 'mock'),
].filter((record) => validAdminCodes.has(record.adminCode))

const resolvedMockElectionResults: ElectionResult[] = normalizeElectionCollection(
  [...mockElectionResults, ...buildDerivedElectionResults()],
  'mock',
).filter((record) => validAdminCodes.has(record.adminCode))

export const getMockProvinces = () => provinceCatalog

export const getMockProvinceByCode = (provinceCode: ProvinceCode) =>
  provinceLookup[provinceCode] ?? null

export const getMockCities = (provinceCode: ProvinceCode) =>
  cityCatalog.filter((city) => city.provinceCode === provinceCode)

export const getMockCityByCode = (cityCode: CityCode) => cityLookup[cityCode] ?? null

export const getMockTowns = (cityCode: CityCode) =>
  townCatalog.filter((town) => town.cityCode === cityCode)

export const getMockTownByCode = (townCode: TownCode) => townLookup[townCode] ?? null

export const getMockPopulationStats = (
  level: AdminLevel,
  parentCode?: AdminCode,
) =>
  resolvedMockPopulationStats.filter((record) => {
    if (record.adminLevel !== level) {
      return false
    }

    if (!parentCode) {
      return true
    }

    if (level === 'province') {
      return record.adminCode === parentCode
    }

    if (level === 'city') {
      return String(record.adminCode).startsWith(parentCode)
    }

    return getCityCodeFromTown(String(record.adminCode)) === parentCode
  })

export const getMockPopulationByCode = (adminCode: AdminCode) => {
  const level = getAdminLevelFromCode(adminCode)
  return (
    getMockPopulationStats(level).find((record) => record.adminCode === adminCode) ??
    null
  )
}

export const getMockElectionResults = (
  level?: AdminLevel,
  parentCode?: AdminCode,
  electionId?: string,
) =>
  resolvedMockElectionResults.filter((record) => {
    if (level && record.adminLevel !== level) {
      return false
    }

    if (electionId && record.electionId !== electionId) {
      return false
    }

    if (!parentCode) {
      return true
    }

    return level === 'province'
      ? record.adminCode === parentCode
      : String(record.adminCode).startsWith(parentCode)
  })

export const getMockElectionResultByCode = (
  adminCode: AdminCode,
  electionId?: string,
) => {
  const level = getAdminLevelFromCode(adminCode)
  const results = getMockElectionResults(level, undefined, electionId).filter(
    (record) => record.adminCode === adminCode,
  )
  return getTopElectionResult(results)
}

export const createPopulationMetricLookup = (
  records: PopulationStats[],
) =>
  Object.fromEntries(
    records.map((record) => [record.adminCode, record.totalPopulation]),
  ) as Record<AdminCode, number>

export const createElectionLookup = (records: ElectionResult[]) =>
  Object.fromEntries(
    records.map((record) => [record.adminCode, record]),
  ) as Record<AdminCode, ElectionResult>
