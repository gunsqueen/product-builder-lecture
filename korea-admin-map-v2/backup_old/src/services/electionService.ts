import { mockElectionSeed } from '../data/mock/election'
import { getCitiesByProvince, getProvinces, getTownsByCity } from './adminService'
import { updateDataSourceStatus } from './dataSourceStatusService'
import { fetchElectionResults } from './api/electionApi'
import type { ElectionResult } from '../types/election'

const deriveMockElection = (adminLevel: 'province' | 'city' | 'town', parentCode?: string): ElectionResult[] => {
  const targets =
    adminLevel === 'province'
      ? getProvinces().map((item) => ({ adminCode: item.provinceCode, name: item.name }))
      : adminLevel === 'city'
        ? getCitiesByProvince(parentCode ?? '').map((item) => ({ adminCode: item.cityCode, name: item.name }))
        : getTownsByCity(parentCode ?? '').map((item) => ({ adminCode: item.townCode, name: item.name }))

  return targets.flatMap((target, index) => {
    const turnoutRate = 53 + (index % 9)
    const leader = 51 - (index % 5)
    return [
      {
        electionId: mockElectionSeed.electionId,
        electionName: mockElectionSeed.electionName,
        electionType: mockElectionSeed.electionType,
        electionDate: mockElectionSeed.electionDate,
        adminCode: target.adminCode,
        adminLevel,
        regionName: target.name,
        candidateName: 'A 후보',
        partyName: 'A당',
        voteCount: 10000 + index * 300,
        voteRate: leader,
        turnoutRate,
        totalValidVotes: 20000,
        totalVotes: 22000,
        sourceType: 'mock',
        sourceDate: mockElectionSeed.sourceDate,
      },
      {
        electionId: mockElectionSeed.electionId,
        electionName: mockElectionSeed.electionName,
        electionType: mockElectionSeed.electionType,
        electionDate: mockElectionSeed.electionDate,
        adminCode: target.adminCode,
        adminLevel,
        regionName: target.name,
        candidateName: 'B 후보',
        partyName: 'B당',
        voteCount: 9000 + index * 260,
        voteRate: 100 - leader,
        turnoutRate,
        totalValidVotes: 20000,
        totalVotes: 22000,
        sourceType: 'mock',
        sourceDate: mockElectionSeed.sourceDate,
      },
    ]
  })
}

export const loadElectionResults = async (adminLevel: 'province' | 'city' | 'town', parentCode?: string) => {
  const result = await fetchElectionResults()
  let records = result.records
  if (adminLevel === 'city' && parentCode) {
    records = records.filter((item) => item.adminCode.startsWith(parentCode))
  }
  if (adminLevel === 'town' && parentCode) {
    records = records.filter((item) => item.adminCode.startsWith(parentCode))
  }
  if (!records.length) {
    records = deriveMockElection(adminLevel, parentCode)
  }
  updateDataSourceStatus({
    sourceKey: 'election',
    currentSourceType: result.records.length ? result.sourceType : 'mock',
    requestedMode: 'real',
    requestSent: result.requestSent,
    responseReceived: result.responseReceived,
    parseSuccess: result.parseSuccess,
    normalizerSuccess: records.length > 0,
    normalizedItemCount: records.length,
    fallbackReason: (result.records.length ? result.fallbackReason : 'empty_result') as never,
    selectedSourceReason:
      result.records.length && result.sourceType === 'real'
        ? '중앙선관위 real API 사용'
        : result.records.length && result.sourceType === 'snapshot'
          ? 'snapshot 선거 데이터 fallback 사용'
          : 'mock 선거 데이터 사용',
    requestUrl: result.requestUrl,
    statusCode: result.statusCode,
    lastRequestTimestamp: result.requestedAt,
  })
  return records
}
