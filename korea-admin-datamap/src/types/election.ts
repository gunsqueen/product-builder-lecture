import type { AdminCode, AdminLevel } from '@/types/admin'

export type ElectionSourceType = 'mock' | 'snapshot' | 'real'
export type ElectionType =
  | 'presidential'
  | 'national-assembly'
  | 'local-governor'
  | 'local-mayor'
  | 'local-council'
  | 'by-election'
  | 'mock'

export interface ElectionDefinition {
  electionId: string
  electionName: string
  electionType: ElectionType
  electionDate: string
  sourceType: ElectionSourceType
}

export interface ElectionResult {
  electionId: string
  electionName: string
  electionType: ElectionType
  electionDate: string
  regionName: string
  adminCode: AdminCode
  adminLevel: AdminLevel
  candidateName: string
  partyName: string
  voteCount: number
  voteRate: number
  totalValidVotes: number
  totalVotes: number
  turnoutRate: number
  sourceType: ElectionSourceType
  sourceDate: string
}

export interface RawElectionInput {
  electionId: string
  electionName?: string | null
  electionType?: ElectionType | string | null
  electionDate?: string | null
  regionName?: string | null
  adminCode?: string | null
  adminLevel?: string | null
  candidateName?: string | null
  partyName?: string | null
  voteCount?: number | string | null
  voteRate?: number | string | null
  totalValidVotes?: number | string | null
  totalVotes?: number | string | null
  turnoutRate?: number | string | null
  sourceDate?: string | null
  provinceName?: string | null
  cityName?: string | null
  townName?: string | null
}
