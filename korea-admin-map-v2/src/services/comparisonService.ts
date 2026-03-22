import { loadTownBoundaries } from './boundaryService'
import { loadTownElectionResults } from './electionService'
import { loadTownPopulation, findPopulationRecord } from './populationService'
import type { RegionComparisonEntry } from '../types/comparison'
import type { SearchRegionResult } from '../types/search'
import { getCityByCode } from '../utils/adminLookup'

export const loadRegionComparisonEntry = async (
  region: SearchRegionResult,
): Promise<RegionComparisonEntry> => {
  if (region.adminLevel !== 'town' || !region.cityCode || !region.townCode) {
    return {
      region,
      population: null,
      populationSourceType: 'snapshot',
      populationFallbackReason: 'empty_result',
      electionResults: [],
      electionSourceType: 'snapshot',
      electionFallbackReason: 'empty_result',
    }
  }

  const city = getCityByCode(region.cityCode)
  const resolvedCityCode = city?.sgisCode ?? region.cityCode
  const boundaries = await loadTownBoundaries(resolvedCityCode)
  const populationResult = await loadTownPopulation(region.cityCode, boundaries.features)
  const electionResult = await loadTownElectionResults(region.townCode, boundaries.features)

  if (import.meta.env.DEV) {
    console.log('[comparison:region]', {
      adminCode: region.adminCode,
      name: region.name,
      populationSourceType: populationResult.sourceType,
      electionSourceType: electionResult.sourceType,
      missingPopulation: !findPopulationRecord(populationResult.records, region.townCode),
      missingElection: electionResult.records.length === 0,
    })
  }

  return {
    region,
    population: findPopulationRecord(populationResult.records, region.townCode) ?? null,
    populationSourceType: populationResult.sourceType,
    populationFallbackReason: populationResult.fallbackReason,
    electionResults: electionResult.records,
    electionSourceType: electionResult.sourceType,
    electionFallbackReason: electionResult.fallbackReason,
  }
}
