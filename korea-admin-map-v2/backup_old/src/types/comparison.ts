import type { PopulationStats } from './population'
import type { ElectionResult } from './election'
import type { SearchResultItem } from './search'

export interface RegionComparison {
  regionA: SearchResultItem
  regionB: SearchResultItem
  populationA?: PopulationStats
  populationB?: PopulationStats
  electionA?: ElectionResult[]
  electionB?: ElectionResult[]
}
