import type { SourceType } from '../config/app'

export interface ElectionResult {
  electionId: string
  electionName: string
  electionDate: string
  adminCode: string
  candidateName: string
  partyName: string
  voteCount: number
  voteRate: number
  totalVotes: number
  turnoutRate: number | null
  sourceType: SourceType
  sourceDate: string
}
