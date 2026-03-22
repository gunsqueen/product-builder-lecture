import type {
  ComparisonRegion,
  ElectionComparisonResult,
  PopulationComparisonResult,
  RegionComparisonResult,
} from '@/types/comparison'
import type { RegionSearchResult } from '@/types/search'
import { getDefaultElectionId, getElectionResultByCode } from '@/services/electionDataService'
import { getPopulationByCode } from '@/services/populationDataService'
import { getSeniorRatio, getYoungAdultRatio } from '@/utils/populationNormalizer'

const toComparisonRegion = (region: RegionSearchResult): ComparisonRegion => ({
  adminCode: region.adminCode,
  adminLevel: region.adminLevel,
  name: region.name,
})

export const comparePopulation = async (
  regionA: RegionSearchResult,
  regionB: RegionSearchResult,
): Promise<PopulationComparisonResult> => {
  const [regionAPopulation, regionBPopulation] = await Promise.all([
    getPopulationByCode(regionA.adminCode),
    getPopulationByCode(regionB.adminCode),
  ])

  return {
    regionA: toComparisonRegion(regionA),
    regionB: toComparisonRegion(regionB),
    regionAPopulation,
    regionBPopulation,
    totalPopulationDiff:
      (regionAPopulation?.totalPopulation ?? 0) - (regionBPopulation?.totalPopulation ?? 0),
    householdDiff:
      (regionAPopulation?.householdCount ?? 0) - (regionBPopulation?.householdCount ?? 0),
    seniorRatioDiff:
      (regionAPopulation ? getSeniorRatio(regionAPopulation) : 0) -
      (regionBPopulation ? getSeniorRatio(regionBPopulation) : 0),
    youngAdultRatioDiff:
      (regionAPopulation ? getYoungAdultRatio(regionAPopulation) : 0) -
      (regionBPopulation ? getYoungAdultRatio(regionBPopulation) : 0),
  }
}

export const compareElection = async (
  regionA: RegionSearchResult,
  regionB: RegionSearchResult,
): Promise<ElectionComparisonResult> => {
  const sharedElectionId =
    regionA.adminLevel === regionB.adminLevel
      ? await getDefaultElectionId(regionA.adminLevel)
      : null

  const [electionIdA, electionIdB] = await Promise.all([
    sharedElectionId ? Promise.resolve(sharedElectionId) : getDefaultElectionId(regionA.adminLevel),
    sharedElectionId ? Promise.resolve(sharedElectionId) : getDefaultElectionId(regionB.adminLevel),
  ])

  const [topResultA, topResultB] = await Promise.all([
    electionIdA ? getElectionResultByCode(regionA.adminCode, electionIdA) : Promise.resolve(null),
    electionIdB ? getElectionResultByCode(regionB.adminCode, electionIdB) : Promise.resolve(null),
  ])

  return {
    regionA: toComparisonRegion(regionA),
    regionB: toComparisonRegion(regionB),
    electionIdA,
    electionIdB,
    topResultA,
    topResultB,
    voteRateDiff:
      topResultA && topResultB ? topResultA.voteRate - topResultB.voteRate : null,
  }
}

export const compareRegions = async (
  regionA: RegionSearchResult,
  regionB: RegionSearchResult,
): Promise<RegionComparisonResult> => {
  const [populationComparison, electionComparison] = await Promise.all([
    comparePopulation(regionA, regionB),
    compareElection(regionA, regionB),
  ])

  return {
    regionA,
    regionB,
    populationComparison,
    electionComparison,
  }
}
