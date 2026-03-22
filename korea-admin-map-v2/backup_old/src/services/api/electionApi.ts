import electionsSnapshot from '../../data/snapshot/elections.sample.json'
import { APP_CONFIG } from '../../config/app'
import { normalizeElectionRecord } from '../../utils/electionNormalizer'
import { buildRuntimeUrl } from '../../utils/url'
import type { ElectionResult } from '../../types/election'

export const fetchElectionResults = async (): Promise<{
  records: ElectionResult[]
  sourceType: 'real' | 'snapshot' | 'mock'
  fallbackReason: string
  requestUrl?: string
  statusCode?: number
  requestedAt: string
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
}> => {
  const requestedAt = new Date().toISOString()
  const snapshotRecords = (electionsSnapshot as Array<Record<string, unknown>>).map((item) =>
    normalizeElectionRecord({
      electionId: String(item.electionId),
      electionName: String(item.electionName),
      electionType: String(item.electionType),
      electionDate: String(item.electionDate),
      adminCode: String(item.adminCode),
      regionName: String(item.regionName),
      candidateName: String(item.candidateName),
      partyName: String(item.partyName),
      voteCount: Number(item.voteCount),
      voteRate: Number(item.voteRate),
      turnoutRate: Number(item.turnoutRate),
      totalValidVotes: Number(item.totalValidVotes),
      totalVotes: Number(item.totalVotes),
      sourceType: 'snapshot',
      sourceDate: String(item.sourceDate),
    }),
  )

  if (APP_CONFIG.dataMode !== 'real' || !APP_CONFIG.nec.apiKey) {
    return {
      records: snapshotRecords,
      sourceType: 'snapshot',
      fallbackReason: 'missing_api_key',
      requestedAt,
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
    }
  }

  const url = buildRuntimeUrl(APP_CONFIG.nec.baseUrl, APP_CONFIG.nec.path)
  url.searchParams.set('serviceKey', APP_CONFIG.nec.apiKey)
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('resultType', 'json')

  try {
    const response = await fetch(url.toString())
    const statusCode = response.status
    const payload = await response.text()
    if (!response.ok) {
      return {
        records: snapshotRecords,
        sourceType: 'snapshot',
        fallbackReason: statusCode === 403 || statusCode === 401 ? 'approval_required' : statusCode === 404 ? 'not_found' : 'server_error',
        requestUrl: url.toString(),
        statusCode,
        requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: false,
      }
    }
    const parsed = JSON.parse(payload) as { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } }
    const items = parsed.response?.body?.items?.item ?? []
    const records = items.map((item) =>
      normalizeElectionRecord({
        electionId: String(item.sggName ?? 'nec-election'),
        electionName: String(item.sgName ?? '선거 결과'),
        electionType: 'nec',
        electionDate: String(item.sdName ?? 'unknown'),
        adminCode: '11',
        regionName: String(item.sggName ?? item.sdName ?? '알수없음'),
        candidateName: String(item.huboNm ?? ''),
        partyName: String(item.jdName ?? ''),
        voteCount: String(item.dunggub ?? item.vv ?? 0),
        voteRate: String(item.de득표율 ?? item.rltvotprc ?? 0),
        turnoutRate: String(item.totTnpr ?? 0),
        totalValidVotes: String(item.totVotCnt ?? 0),
        totalVotes: String(item.totVotCnt ?? 0),
        sourceType: 'real',
        sourceDate: requestedAt.slice(0, 10),
      }),
    )
    return {
      records: records.length ? records : snapshotRecords,
      sourceType: records.length ? 'real' : 'snapshot',
      fallbackReason: records.length ? 'none' : 'empty_result',
      requestUrl: url.toString(),
      statusCode,
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: true,
    }
  } catch {
    return {
      records: snapshotRecords,
      sourceType: 'snapshot',
      fallbackReason: 'parse_error',
      requestedAt,
      requestSent: true,
      responseReceived: false,
      parseSuccess: false,
    }
  }
}
