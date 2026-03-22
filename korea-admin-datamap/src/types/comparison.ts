import type { AdminLevel } from '@/types/admin'
import type { ElectionResult } from '@/types/election'
import type { PopulationStats } from '@/types/population'
import type { RegionSearchResult } from '@/types/search'

export interface ComparisonRegion {
  adminCode: string
  adminLevel: AdminLevel
  name: string
}

export interface PopulationComparisonResult {
  regionA: ComparisonRegion
  regionB: ComparisonRegion
  regionAPopulation: PopulationStats | null
  regionBPopulation: PopulationStats | null
  totalPopulationDiff: number
  householdDiff: number
  seniorRatioDiff: number
  youngAdultRatioDiff: number
}

export interface ElectionComparisonResult {
  regionA: ComparisonRegion
  regionB: ComparisonRegion
  electionIdA: string | null
  electionIdB: string | null
  topResultA: ElectionResult | null
  topResultB: ElectionResult | null
  voteRateDiff: number | null
}

export interface RegionComparisonResult {
  regionA: RegionSearchResult
  regionB: RegionSearchResult
  populationComparison: PopulationComparisonResult
  electionComparison: ElectionComparisonResult
}
