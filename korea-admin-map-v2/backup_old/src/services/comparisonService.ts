import { getTopElectionResult } from '../utils/electionNormalizer'
import type { ElectionResult } from '../types/election'
import type { PopulationStats } from '../types/population'

export const comparePopulation = (left?: PopulationStats, right?: PopulationStats) => ({
  totalPopulationDiff: (left?.totalPopulation ?? 0) - (right?.totalPopulation ?? 0),
  agingRatioDiff: (left?.agingRatio ?? 0) - (right?.agingRatio ?? 0),
})

export const compareElection = (left: ElectionResult[], right: ElectionResult[]) => ({
  leftTop: getTopElectionResult(left),
  rightTop: getTopElectionResult(right),
})
