import populationSnapshot from '../data/snapshot/population.sample.json'
import { mockPopulationProfiles } from '../data/mock/population'
import { getCitiesByProvince, getProvinces, getTownsByCity } from './adminService'
import { updateDataSourceStatus } from './dataSourceStatusService'
import { fetchPopulationByLevel } from './api/populationApi'
import { scaleAgeBuckets } from '../utils/populationNormalizer'
import type { PopulationStats } from '../types/population'

const snapshotProfiles = new Map(
  (populationSnapshot as Array<Record<string, unknown>>).map((item) => [
    String(item.adminCode),
    {
      age0to14: Number(item.age0to9) + Math.round(Number(item.age10to19) / 2),
      age15to64:
        Math.round(Number(item.age10to19) / 2) +
        Number(item.age20to29) +
        Number(item.age30to39) +
        Number(item.age40to49) +
        Number(item.age50to59) +
        Number(item.age60to64),
      age65plus: Number(item.age65plus),
    },
  ]),
)

const deriveMockPopulation = (adminLevel: 'province' | 'city' | 'town', parentCode?: string): PopulationStats[] => {
  const targets =
    adminLevel === 'province'
      ? getProvinces().map((item) => ({ adminCode: item.provinceCode, adminLevel }))
      : adminLevel === 'city'
        ? getCitiesByProvince(parentCode ?? '').map((item) => ({ adminCode: item.cityCode, adminLevel }))
        : getTownsByCity(parentCode ?? '').map((item) => ({ adminCode: item.townCode, adminLevel }))

  return targets.map((target, index) => {
    const base = adminLevel === 'province' ? 1100000 : adminLevel === 'city' ? 120000 : 18000
    const totalPopulation = base + index * (adminLevel === 'town' ? 970 : 3500)
    const householdCount = Math.round(totalPopulation * 0.43)
    const malePopulation = Math.round(totalPopulation * 0.49)
    const femalePopulation = totalPopulation - malePopulation
    const profile = mockPopulationProfiles[adminLevel]
    const scaled = scaleAgeBuckets(
      {
        adminCode: target.adminCode,
        adminLevel,
        totalPopulation,
        householdCount,
        malePopulation,
        femalePopulation,
        age0to14: 0,
        age15to64: 0,
        age65plus: 0,
        youthRatio: 0,
        agingRatio: 0,
        sourceType: 'mock',
        sourceDate: '2026-03-01',
      },
      profile,
    )
    return scaled
  })
}

const updatePopulationStatus = (sourceType: 'real' | 'snapshot' | 'mock', result: Awaited<ReturnType<typeof fetchPopulationByLevel>>, count: number) => {
  updateDataSourceStatus({
    sourceKey: 'population',
    currentSourceType: sourceType,
    requestedMode: 'real',
    requestSent: result.requestSent,
    responseReceived: result.responseReceived,
    parseSuccess: result.parseSuccess,
    normalizerSuccess: count > 0,
    normalizedItemCount: count,
    fallbackReason: result.fallbackReason as never,
    selectedSourceReason:
      sourceType === 'real'
        ? '행정안전부 인구 API 사용'
        : sourceType === 'snapshot'
          ? 'snapshot 인구 데이터 fallback 사용'
          : 'mock 인구 데이터 사용',
    requestUrl: result.requestUrl,
    statusCode: result.statusCode,
    lastRequestTimestamp: result.requestedAt,
  })
}

export const loadPopulationByLevel = async (
  adminLevel: 'province' | 'city' | 'town',
  parentCode?: string,
) => {
  const result = await fetchPopulationByLevel(adminLevel, parentCode)
  let records = result.records

  if (adminLevel === 'city' && parentCode) {
    records = records.filter((item) => item.adminCode.startsWith(parentCode))
  }

  if (adminLevel === 'town' && parentCode) {
    records = records.filter((item) => item.adminCode.startsWith(parentCode))
  }

  if (!records.length) {
    records = deriveMockPopulation(adminLevel, parentCode)
    updatePopulationStatus('mock', result, records.length)
    return records
  }

  records = records.map((record) => scaleAgeBuckets(record, snapshotProfiles.get(record.adminCode) ?? mockPopulationProfiles[record.adminLevel]))
  updatePopulationStatus(result.sourceType, result, records.length)
  return records
}

export const findPopulationRecord = (records: PopulationStats[], adminCode: string) =>
  records.find((record) => record.adminCode === adminCode)
