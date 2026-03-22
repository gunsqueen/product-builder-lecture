import { THEMATIC_METRICS } from '@/config/thematicMetrics'
import {
  listAllCityMasters,
  listAllProvinceMasters,
  listAllTownMasters,
} from '@/services/adminDataService'
import { getDefaultElectionId, getElectionResults } from '@/services/electionDataService'
import { getPopulationStats } from '@/services/populationDataService'
import type { AdminCode, AdminLevel } from '@/types/admin'
import type { ElectionResult } from '@/types/election'
import type {
  ThematicMapMetricItem,
  ThematicMapResult,
  ThematicMetricKey,
} from '@/types/thematicMap'
import {
  createLegendRanges,
  getColorForValue,
} from '@/utils/colorScale'
import {
  calculateAgingRate,
  calculateTopCandidateVoteRate,
  calculateTopPartyVoteRate,
  calculateTurnoutRate,
  calculateYouth2039Rate,
} from '@/utils/metricCalculators'

const NO_DATA_COLOR = '#d6e1e3'

const matchesScope = (
  level: AdminLevel,
  adminCode: string,
  regionScope?: string,
) => {
  if (!regionScope) {
    return true
  }

  if (level === 'province') {
    return adminCode === regionScope
  }

  return adminCode.startsWith(regionScope)
}

const getCatalogByLevel = (level: AdminLevel, regionScope?: string) => {
  if (level === 'province') {
    return listAllProvinceMasters()
      .filter((province) => matchesScope(level, province.code, regionScope))
      .map((province) => ({
        code: province.code,
        name: province.name,
      }))
  }

  if (level === 'city') {
    return listAllCityMasters()
      .filter((city) => matchesScope(level, city.code, regionScope))
      .map((city) => ({
        code: city.code,
        name: city.name,
      }))
  }

  return listAllTownMasters()
    .filter((town) => matchesScope(level, town.code, regionScope))
    .map((town) => ({
      code: town.code,
      name: town.name,
    }))
}

const groupElectionResults = (results: ElectionResult[]) =>
  results.reduce<Record<string, ElectionResult[]>>((lookup, result) => {
    if (!lookup[result.adminCode]) {
      lookup[result.adminCode] = []
    }

    lookup[result.adminCode].push(result)
    return lookup
  }, {})

const calculateMetricValue = (
  metricKey: ThematicMetricKey,
  populationRecord: Awaited<ReturnType<typeof getPopulationStats>>[number] | null,
  electionResults: ElectionResult[],
) => {
  if (metricKey === 'totalPopulation') {
    return populationRecord?.totalPopulation ?? null
  }

  if (metricKey === 'householdCount') {
    return populationRecord?.householdCount ?? null
  }

  if (metricKey === 'agingRate') {
    return populationRecord ? calculateAgingRate(populationRecord) : null
  }

  if (metricKey === 'youth2039Rate') {
    return populationRecord ? calculateYouth2039Rate(populationRecord) : null
  }

  if (metricKey === 'turnoutRate') {
    return electionResults.length > 0 ? calculateTurnoutRate(electionResults) : null
  }

  if (metricKey === 'topCandidateVoteRate') {
    return electionResults.length > 0
      ? calculateTopCandidateVoteRate(electionResults)
      : null
  }

  return electionResults.length > 0 ? calculateTopPartyVoteRate(electionResults) : null
}

export const getThematicMapData = async (
  metricKey: ThematicMetricKey,
  adminLevel: AdminLevel,
  regionScope?: AdminCode,
): Promise<ThematicMapResult> => {
  const metricDefinition = THEMATIC_METRICS[metricKey]
  const catalog = getCatalogByLevel(adminLevel, regionScope)
  const populationRecords = await getPopulationStats(adminLevel, regionScope)
  const populationLookup = Object.fromEntries(
    populationRecords.map((record) => [record.adminCode, record]),
  )

  let electionResultsByCode: Record<string, ElectionResult[]> = {}
  let electionSourceType: ThematicMapResult['sourceType'] | null = null
  let electionSourceDate: string | null = null

  if (metricDefinition.sourceDomain === 'election') {
    const electionId = await getDefaultElectionId(adminLevel)
    const electionResults = electionId ? await getElectionResults(adminLevel, electionId) : []
    const filteredElectionResults = electionResults.filter((result) =>
      matchesScope(adminLevel, result.adminCode, regionScope),
    )

    electionResultsByCode = groupElectionResults(filteredElectionResults)
    electionSourceType = filteredElectionResults[0]?.sourceType ?? 'snapshot'
    electionSourceDate = filteredElectionResults[0]?.sourceDate ?? '1970-01-01'
  }

  const missingPopulationCodes: string[] = []
  const missingElectionCodes: string[] = []
  const calculationUnavailableCodes: string[] = []

  const draftItems = catalog.map((region) => {
    const populationRecord = populationLookup[region.code] ?? null
    const electionResults = electionResultsByCode[region.code] ?? []

    if (
      metricDefinition.sourceDomain === 'population' &&
      !populationRecord
    ) {
      missingPopulationCodes.push(region.code)
    }

    if (
      metricDefinition.sourceDomain === 'election' &&
      electionResults.length === 0
    ) {
      missingElectionCodes.push(region.code)
    }

    const value = calculateMetricValue(metricKey, populationRecord, electionResults)

    if (value === null) {
      calculationUnavailableCodes.push(region.code)
    }

    const sourceType =
      metricDefinition.sourceDomain === 'population'
        ? populationRecord?.sourceType ?? 'snapshot'
        : electionResults[0]?.sourceType ?? electionSourceType ?? 'snapshot'
    const sourceDate =
      metricDefinition.sourceDomain === 'population'
        ? populationRecord?.sourceDate ?? '1970-01-01'
        : electionResults[0]?.sourceDate ?? electionSourceDate ?? '1970-01-01'

    return {
      metricKey,
      metricLabel: metricDefinition.label,
      adminCode: region.code,
      adminLevel,
      value,
      formattedValue: metricDefinition.formatter(value),
      colorClass: NO_DATA_COLOR,
      sourceType,
      sourceDate,
    } satisfies ThematicMapMetricItem
  })

  const validValues = draftItems
    .map((item) => item.value)
    .filter((value): value is number => value !== null)

  const legendRanges = createLegendRanges(
    validValues,
    metricDefinition.defaultColorScale,
    metricDefinition.scaleMethod,
    metricDefinition.formatter,
  )

  const items = draftItems.map((item) => ({
    ...item,
    colorClass: getColorForValue(
      item.value,
      validValues,
      metricDefinition.defaultColorScale,
      metricDefinition.scaleMethod,
      NO_DATA_COLOR,
    ),
  }))

  return {
    metricKey,
    metricLabel: metricDefinition.label,
    description: metricDefinition.description,
    adminLevel,
    items,
    lookup: Object.fromEntries(items.map((item) => [item.adminCode, item])),
    legendRanges,
    noDataColor: NO_DATA_COLOR,
    sourceDomain: metricDefinition.sourceDomain,
    sourceType:
      items.find((item) => item.value !== null)?.sourceType ??
      (metricDefinition.sourceDomain === 'population'
        ? populationRecords[0]?.sourceType ?? 'snapshot'
        : electionSourceType ?? 'snapshot'),
    sourceDate:
      items.find((item) => item.value !== null)?.sourceDate ??
      (metricDefinition.sourceDomain === 'population'
        ? populationRecords[0]?.sourceDate ?? '1970-01-01'
        : electionSourceDate ?? '1970-01-01'),
    missingPopulationCodes,
    missingElectionCodes,
    calculationUnavailableCodes,
  }
}
