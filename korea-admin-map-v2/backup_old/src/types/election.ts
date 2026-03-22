import type { AdminCode, AdminLevel } from './admin'
import type { SourceType } from '../config/app'

export interface ElectionResult {
  electionId: string
  electionName: string
  electionType: string
  electionDate: string
  adminCode: AdminCode
  adminLevel: AdminLevel
  regionName: string
  candidateName: string
  partyName: string
  voteCount: number
  voteRate: number
  turnoutRate: number
  totalValidVotes: number
  totalVotes: number
  sourceType: SourceType
  sourceDate: string
}
