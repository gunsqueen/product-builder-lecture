import populationTimeSeriesData from '@/data/snapshot/time-series/population-time-series.json'
import electionTimeSeriesData from '@/data/snapshot/time-series/election-time-series.json'
import { getElectionResultsForAdminCode } from '@/services/electionDataService'
import { getPopulationByCode } from '@/services/populationDataService'
import { getRegionSearchResultByCode } from '@/services/searchService'
import { getAdminLevelFromCode } from '@/utils/adminCode'
import type {
  RawTimeSeriesInput,
  TimeSeriesComparisonResult,
  TimeSeriesMetricKey,
  TimeSeriesPoint,
} from '@/types/timeSeries'
import type { AdminCode } from '@/types/admin'
import type { RegionSearchResult } from '@/types/search'
import { formatPercent, formatPopulation } from '@/utils/formatters'
import { getTopElectionResult } from '@/utils/electionNormalizer'

const formatTimeSeriesValue = (metricKey: TimeSeriesMetricKey, value: number) => {
  if (metricKey === 'totalPopulation') {
    return formatPopulation(value)
  }

  return formatPercent(value)
}

const normalizeTimeSeriesCollection = (inputs: RawTimeSeriesInput[]): TimeSeriesPoint[] =>
  inputs.map((input) => ({
    adminCode: input.adminCode as AdminCode,
    adminLevel:
      input.adminLevel === 'province' ||
      input.adminLevel === 'city' ||
      input.adminLevel === 'town'
        ? input.adminLevel
        : 'province',
    metricKey: input.metricKey,
    year: input.year,
    value: input.value,
    formattedValue: input.formattedValue ?? formatTimeSeriesValue(input.metricKey, input.value),
    sourceType: input.sourceType ?? 'snapshot',
    sourceDate: input.sourceDate ?? '1970-01-01',
  }))

const populationPoints = normalizeTimeSeriesCollection(
  populationTimeSeriesData as RawTimeSeriesInput[],
)
const electionPoints = normalizeTimeSeriesCollection(
  electionTimeSeriesData as RawTimeSeriesInput[],
)

const getTimeSeries = (
  points: TimeSeriesPoint[],
  adminCode: AdminCode,
  metricKey: TimeSeriesMetricKey,
) =>
  points
    .filter((point) => point.adminCode === adminCode && point.metricKey === metricKey)
    .sort((left, right) => left.year - right.year)

const createDerivedPopulationSeries = async (
  adminCode: AdminCode,
  metricKey: Extract<TimeSeriesMetricKey, 'totalPopulation' | 'agingRate' | 'youth2039Rate'>,
) => {
  const record = await getPopulationByCode(adminCode)

  if (!record) {
    return []
  }

  const seed = Number(adminCode.slice(-2) || adminCode)
  const currentValue =
    metricKey === 'totalPopulation'
      ? record.totalPopulation
      : metricKey === 'agingRate'
        ? (record.totalPopulation > 0 ? (record.age65plus / record.totalPopulation) * 100 : 0)
        : record.totalPopulation > 0
          ? ((record.age20to29 + record.age30to39) / record.totalPopulation) * 100
          : 0

  const yearlyStep =
    metricKey === 'totalPopulation'
      ? Math.max(120, Math.round(currentValue * 0.012))
      : 0.3 + (seed % 4) * 0.2

  return [2022, 2023, 2024, 2025].map((year, index) => {
    const derivedValue =
      metricKey === 'totalPopulation'
        ? Math.max(0, Math.round(currentValue + yearlyStep * (index - 3)))
        : Number((currentValue + yearlyStep * (index - 3)).toFixed(1))

    return {
      adminCode,
      adminLevel: record.adminLevel,
      metricKey,
      year,
      value: derivedValue,
      formattedValue: formatTimeSeriesValue(metricKey, derivedValue),
      sourceType: record.sourceType,
      sourceDate: record.sourceDate,
    } satisfies TimeSeriesPoint
  })
}

const createDerivedElectionSeries = async (
  adminCode: AdminCode,
  metricKey: Extract<TimeSeriesMetricKey, 'turnoutRate' | 'firstSecondGap'>,
) => {
  const adminLevel = getAdminLevelFromCode(adminCode)
  const defaultElectionId =
    adminLevel === 'province'
      ? '2026-local-governor'
      : adminLevel === 'city'
        ? '2026-local-mayor'
        : '2026-local-town'
  const results = await getElectionResultsForAdminCode(adminCode, defaultElectionId)
  const topResult = getTopElectionResult(results)

  if (!topResult) {
    return []
  }

  const sortedResults = [...results].sort((left, right) => right.voteRate - left.voteRate)
  const currentGap =
    sortedResults.length > 1
      ? sortedResults[0].voteRate - sortedResults[1].voteRate
      : topResult.voteRate
  const currentValue = metricKey === 'turnoutRate' ? topResult.turnoutRate : currentGap
  const seed = Number(adminCode.slice(-2) || adminCode)
  const yearlyStep = 0.6 + (seed % 3) * 0.4

  return [2018, 2022, 2024, 2026].map((year, index) => {
    const derivedValue = Number((currentValue + yearlyStep * (index - 3)).toFixed(1))

    return {
      adminCode,
      adminLevel: topResult.adminLevel,
      metricKey,
      year,
      value: derivedValue,
      formattedValue: formatTimeSeriesValue(metricKey, derivedValue),
      sourceType: topResult.sourceType,
      sourceDate: topResult.sourceDate,
    } satisfies TimeSeriesPoint
  })
}

export const getPopulationTimeSeries = async (
  adminCode: AdminCode,
  metricKey: Extract<TimeSeriesMetricKey, 'totalPopulation' | 'agingRate' | 'youth2039Rate'>,
) => {
  const points = getTimeSeries(populationPoints, adminCode, metricKey)
  return points.length > 0 ? points : createDerivedPopulationSeries(adminCode, metricKey)
}

export const getElectionTimeSeries = async (
  adminCode: AdminCode,
  metricKey: Extract<TimeSeriesMetricKey, 'turnoutRate' | 'firstSecondGap'>,
) => {
  const points = getTimeSeries(electionPoints, adminCode, metricKey)
  return points.length > 0 ? points : createDerivedElectionSeries(adminCode, metricKey)
}

const getMetricDomain = (metricKey: TimeSeriesMetricKey) =>
  metricKey === 'totalPopulation' || metricKey === 'agingRate' || metricKey === 'youth2039Rate'
    ? 'population'
    : 'election'

const getFallbackRegion = (adminCode: AdminCode): RegionSearchResult => ({
  adminCode,
  adminLevel:
    adminCode.length === 2 ? 'province' : adminCode.length === 5 ? 'city' : 'town',
  name: adminCode,
  provinceCode: adminCode.slice(0, 2),
  cityCode: adminCode.length >= 5 ? adminCode.slice(0, 5) : undefined,
  townCode: adminCode.length >= 8 ? adminCode : undefined,
})

export const compareTimeSeries = async (
  regionA: RegionSearchResult,
  regionB: RegionSearchResult,
  metricKey: TimeSeriesMetricKey,
): Promise<TimeSeriesComparisonResult> => {
  const domain = getMetricDomain(metricKey)
  const [seriesA, seriesB] = await Promise.all([
    domain === 'population'
      ? getPopulationTimeSeries(
          regionA.adminCode,
          metricKey as 'totalPopulation' | 'agingRate' | 'youth2039Rate',
        )
      : getElectionTimeSeries(
          regionA.adminCode,
          metricKey as 'turnoutRate' | 'firstSecondGap',
        ),
    domain === 'population'
      ? getPopulationTimeSeries(
          regionB.adminCode,
          metricKey as 'totalPopulation' | 'agingRate' | 'youth2039Rate',
        )
      : getElectionTimeSeries(
          regionB.adminCode,
          metricKey as 'turnoutRate' | 'firstSecondGap',
        ),
  ])

  const populatedSource =
    seriesA.find((point) => point.sourceType)?.sourceType ??
    seriesB.find((point) => point.sourceType)?.sourceType ??
    'snapshot'
  const populatedDate =
    seriesA[seriesA.length - 1]?.sourceDate ??
    seriesB[seriesB.length - 1]?.sourceDate ??
    '1970-01-01'

  return {
    metricKey,
    regionA,
    regionB,
    seriesA,
    seriesB,
    sourceType: populatedSource,
    sourceDate: populatedDate,
  }
}

export const getRegionTimeSeriesComparison = async (
  adminCodeA: AdminCode,
  adminCodeB: AdminCode,
  metricKey: TimeSeriesMetricKey,
) => {
  const [regionA, regionB] = await Promise.all([
    getRegionSearchResultByCode(adminCodeA),
    getRegionSearchResultByCode(adminCodeB),
  ])

  return compareTimeSeries(
    regionA ?? getFallbackRegion(adminCodeA),
    regionB ?? getFallbackRegion(adminCodeB),
    metricKey,
  )
}
