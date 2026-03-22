import type { ElectionResult } from '@/types/election'

export const normalizedElectionExample: ElectionResult = {
  electionId: '2026-local-governor',
  electionName: '2026 지방선거 광역단체장',
  electionType: 'local-governor',
  electionDate: '2026-06-03',
  regionName: '서울특별시',
  adminCode: '11',
  adminLevel: 'province',
  candidateName: '개혁연합 후보',
  partyName: '개혁연합',
  voteCount: 1930000,
  voteRate: 49.3,
  totalValidVotes: 3915000,
  totalVotes: 4150000,
  turnoutRate: 61.4,
  sourceType: 'real',
  sourceDate: '2026-06-04',
}
