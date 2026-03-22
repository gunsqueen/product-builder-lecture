import type { ElectionResult } from './election'
import type { PopulationStats } from './population'
import type { SearchRegionResult } from './search'

export interface RegionComparisonEntry {
  region: SearchRegionResult
  population: PopulationStats | null
  populationSourceType: string
  populationFallbackReason: string
  electionResults: ElectionResult[]
  electionSourceType: string
  electionFallbackReason: string
}

export interface TimeFreeComparisonResult {
  regionA: RegionComparisonEntry | null
  regionB: RegionComparisonEntry | null
}
