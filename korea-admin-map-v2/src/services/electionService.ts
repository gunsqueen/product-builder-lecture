import { fetchTownElectionResults } from './api/electionApi'
import { updateDataSourceStatus } from './dataSourceStatusService'
import type { BoundaryFeature } from '../types/admin'
import type { ElectionResult } from '../types/election'

type TownElectionServiceResult = {
  records: ElectionResult[]
  sourceType: 'real' | 'snapshot' | 'mock'
  fallbackReason: string
  requestUrl?: string
  statusCode?: number
}

export const loadTownElectionResults = async (
  townCode: string,
  boundaries: BoundaryFeature[],
): Promise<TownElectionServiceResult> => {
  const result = await fetchTownElectionResults(townCode, boundaries)

  updateDataSourceStatus({
    sourceKey: 'election',
    currentSourceType: result.sourceType,
    requestedMode: 'real',
    requestSent: result.requestSent,
    responseReceived: result.responseReceived,
    parseSuccess: result.parseSuccess,
    normalizerSuccess: result.records.length > 0,
    normalizedItemCount: result.records.length,
    statusCode: result.statusCode,
    requestUrl: result.requestUrl,
    fallbackReason: result.fallbackReason as never,
    selectedSourceReason:
      result.sourceType === 'real'
        ? 'NEC real 선거 데이터 사용'
        : result.fallbackReason === 'approval_required'
          ? 'NEC 승인/권한 문제로 snapshot fallback 사용'
          : 'snapshot 선거 데이터 사용',
    lastRequestTimestamp: result.requestedAt,
  })

  return {
    records: result.records,
    sourceType: result.sourceType,
    fallbackReason: result.fallbackReason,
    requestUrl: result.requestUrl,
    statusCode: result.statusCode,
  }
}
