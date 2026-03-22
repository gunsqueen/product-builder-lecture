import type { ElectionResult } from '../types/election'
import { getAdminLevel } from './adminCode'

const numberValue = (value: string | number | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return value ? Number(String(value).replaceAll(',', '').trim()) || 0 : 0
}

export const normalizeElectionRecord = (input: {
  electionId: string
  electionName: string
  electionType: string
  electionDate: string
  adminCode: string
  regionName: string
  candidateName: string
  partyName: string
  voteCount: string | number
  voteRate: string | number
  turnoutRate: string | number
  totalValidVotes: string | number
  totalVotes: string | number
  sourceType: 'real' | 'snapshot' | 'mock'
  sourceDate: string
}): ElectionResult => ({
  electionId: input.electionId,
  electionName: input.electionName,
  electionType: input.electionType,
  electionDate: input.electionDate,
  adminCode: input.adminCode,
  adminLevel: getAdminLevel(input.adminCode),
  regionName: input.regionName,
  candidateName: input.candidateName,
  partyName: input.partyName,
  voteCount: numberValue(input.voteCount),
  voteRate: numberValue(input.voteRate),
  turnoutRate: numberValue(input.turnoutRate),
  totalValidVotes: numberValue(input.totalValidVotes),
  totalVotes: numberValue(input.totalVotes),
  sourceType: input.sourceType,
  sourceDate: input.sourceDate,
})

export const getTopElectionResult = (records: ElectionResult[]) =>
  [...records].sort((a, b) => b.voteRate - a.voteRate)[0]
