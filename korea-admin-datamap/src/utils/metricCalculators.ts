import type { ElectionResult } from '@/types/election'
import type { PopulationStats } from '@/types/population'

const safeDivide = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0

export const calculateAgingRate = (record: PopulationStats | null) =>
  record ? safeDivide(record.age65plus, record.totalPopulation) * 100 : 0

export const calculateYouth2039Rate = (record: PopulationStats | null) =>
  record
    ? safeDivide(record.age20to29 + record.age30to39, record.totalPopulation) * 100
    : 0

export const calculateTurnoutRate = (results: ElectionResult[]) =>
  results[0]?.turnoutRate ?? 0

export const calculateTopCandidateVoteRate = (results: ElectionResult[]) =>
  results.reduce(
    (maxValue, result) => Math.max(maxValue, result.voteRate ?? 0),
    0,
  )

export const calculateTopPartyVoteRate = (results: ElectionResult[]) => {
  if (results.length === 0) {
    return 0
  }

  const totalValidVotes = results[0]?.totalValidVotes ?? 0
  const partyVoteCounts = new Map<string, number>()

  results.forEach((result) => {
    partyVoteCounts.set(
      result.partyName,
      (partyVoteCounts.get(result.partyName) ?? 0) + (result.voteCount ?? 0),
    )
  })

  const topPartyVotes = Math.max(...partyVoteCounts.values(), 0)
  return safeDivide(topPartyVotes, totalValidVotes) * 100
}
