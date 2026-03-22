import type { ElectionResult } from '../types/election'
import type { PopulationStats } from '../types/population'
import { getTopElectionResult } from './electionNormalizer'

export const calculateAgingRatio = (stats?: PopulationStats) => stats?.agingRatio ?? null
export const calculateTotalPopulation = (stats?: PopulationStats) => stats?.totalPopulation ?? null
export const calculateTurnoutRate = (records: ElectionResult[]) => records[0]?.turnoutRate ?? null
export const calculateTopVoteRate = (records: ElectionResult[]) => getTopElectionResult(records)?.voteRate ?? null
