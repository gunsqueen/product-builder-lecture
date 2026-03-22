import type { ElectionResult } from '../types/election'

const toNumber = (value: string | number | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return value ? Number(String(value).replaceAll(',', '').trim()) || 0 : 0
}

export const normalizeElectionRecord = (input: {
  electionId: string
  electionName: string
  electionDate: string
  adminCode: string
  candidateName: string
  partyName: string
  voteCount: string | number
  voteRate: string | number
  totalVotes: string | number
  turnoutRate?: string | number
  sourceType: 'real' | 'snapshot' | 'mock'
  sourceDate: string
}): ElectionResult => ({
  electionId: input.electionId,
  electionName: input.electionName,
  electionDate: input.electionDate,
  adminCode: input.adminCode,
  candidateName: input.candidateName,
  partyName: input.partyName,
  voteCount: toNumber(input.voteCount),
  voteRate: toNumber(input.voteRate),
  totalVotes: toNumber(input.totalVotes),
  turnoutRate: input.turnoutRate == null ? null : toNumber(input.turnoutRate),
  sourceType: input.sourceType,
  sourceDate: input.sourceDate,
})
