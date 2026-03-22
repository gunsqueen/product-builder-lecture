import gangseoElectionSnapshot from '../../data/snapshot/gangseo-town-election.json'
import { APP_CONFIG, isDev } from '../../config/app'
import { normalizeAdminName } from '../../utils/adminName'
import { normalizeElectionRecord } from '../../utils/electionNormalizer'
import { buildTownElectionLookup } from '../../utils/electionRegionMapper'
import { buildRuntimeUrl } from '../../utils/url'
import type { BoundaryFeature } from '../../types/admin'
import type { ElectionResult } from '../../types/election'

type ElectionApiResult = {
  records: ElectionResult[]
  sourceType: 'real' | 'snapshot' | 'mock'
  fallbackReason: string
  requestUrl?: string
  statusCode?: number
  requestedAt: string
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
  mappingSuccessCount: number
  mappingFailCount: number
}

type RawElectionRecord = {
  electionId?: string
  electionName?: string
  electionDate?: string
  adminCode?: string
  regionName?: string
  candidateName?: string
  partyName?: string
  voteCount?: string | number
  voteRate?: string | number
  totalVotes?: string | number
  turnoutRate?: string | number
  sourceDate?: string
}

const DEFAULT_ELECTION_ID = '2022-local-mayor'
const DEFAULT_ELECTION_NAME = '2022 지방선거 서울시장'
const DEFAULT_ELECTION_DATE = '2022-06-01'

const snapshotRecords = (gangseoElectionSnapshot as RawElectionRecord[]).map((item) =>
  normalizeElectionRecord({
    electionId: item.electionId ?? DEFAULT_ELECTION_ID,
    electionName: item.electionName ?? DEFAULT_ELECTION_NAME,
    electionDate: item.electionDate ?? DEFAULT_ELECTION_DATE,
    adminCode: String(item.adminCode ?? ''),
    candidateName: item.candidateName ?? '',
    partyName: item.partyName ?? '',
    voteCount: item.voteCount ?? 0,
    voteRate: item.voteRate ?? 0,
    totalVotes: item.totalVotes ?? 0,
    turnoutRate: item.turnoutRate,
    sourceType: 'snapshot',
    sourceDate: item.sourceDate ?? DEFAULT_ELECTION_DATE,
  }),
)

const parseJsonPayload = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return [] as RawElectionRecord[]
  const candidates = [
    (payload as { response?: { body?: { items?: { item?: unknown } } } }).response?.body?.items?.item,
    (payload as { body?: { items?: { item?: unknown } } }).body?.items?.item,
    (payload as { items?: { item?: unknown } }).items?.item,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as RawElectionRecord[]
    if (candidate && typeof candidate === 'object') return [candidate as RawElectionRecord]
  }

  return []
}

const parseXmlItems = (xml: string): RawElectionRecord[] => {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
  const read = (chunk: string, tag: string) => {
    const match = chunk.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return match?.[1]?.trim()
  }

  return itemMatches.map((match) => ({
    electionId: read(match[1], 'sgId') ?? read(match[1], 'electionId'),
    electionName: read(match[1], 'sgTypecodeNm') ?? read(match[1], 'sgName'),
    electionDate: read(match[1], 'sgVotedate') ?? read(match[1], 'sgDate'),
    regionName:
      read(match[1], 'sdName') ??
      read(match[1], 'sggName') ??
      read(match[1], 'emdName') ??
      read(match[1], 'regionName'),
    candidateName: read(match[1], 'huboNm') ?? read(match[1], 'candidateName'),
    partyName: read(match[1], 'jdName') ?? read(match[1], 'partyName'),
    voteCount: read(match[1], 'dasiTmae') ?? read(match[1], 'voteCount') ?? 0,
    voteRate: read(match[1], 'dasiRate') ?? read(match[1], 'voteRate') ?? 0,
    totalVotes: read(match[1], 'totVoteCnt') ?? read(match[1], 'totalVotes') ?? 0,
    turnoutRate: read(match[1], 'turnout') ?? read(match[1], 'turnoutRate'),
    sourceDate: read(match[1], 'sgVotedate') ?? DEFAULT_ELECTION_DATE,
  }))
}

const mapRecordsToTownCodes = (records: RawElectionRecord[], boundaries: BoundaryFeature[]) => {
  const lookup = buildTownElectionLookup(boundaries)
  let mappingSuccessCount = 0
  let mappingFailCount = 0

  const normalized = records
    .map((record) => {
      const directCode = record.adminCode?.trim()
      const adminCode =
        directCode && directCode.length >= 8
          ? directCode
          : lookup.get(normalizeAdminName(record.regionName ?? ''))
      if (!adminCode) {
        mappingFailCount += 1
        return null
      }

      mappingSuccessCount += 1
      return normalizeElectionRecord({
        electionId: record.electionId ?? DEFAULT_ELECTION_ID,
        electionName: record.electionName ?? DEFAULT_ELECTION_NAME,
        electionDate: record.electionDate ?? DEFAULT_ELECTION_DATE,
        adminCode,
        candidateName: record.candidateName ?? '',
        partyName: record.partyName ?? '',
        voteCount: record.voteCount ?? 0,
        voteRate: record.voteRate ?? 0,
        totalVotes: record.totalVotes ?? 0,
        turnoutRate: record.turnoutRate,
        sourceType: 'real',
        sourceDate: record.sourceDate ?? DEFAULT_ELECTION_DATE,
      })
    })
    .filter((value): value is ElectionResult => value !== null)

  return { normalized, mappingSuccessCount, mappingFailCount }
}

export const fetchTownElectionResults = async (
  townCode: string,
  boundaries: BoundaryFeature[],
): Promise<ElectionApiResult> => {
  const requestedAt = new Date().toISOString()
  const snapshot = snapshotRecords.filter((record) => record.adminCode === townCode)

  if (APP_CONFIG.dataMode !== 'real') {
    return {
      records: snapshot,
      sourceType: 'snapshot',
      fallbackReason: 'none',
      requestedAt,
      requestSent: false,
      responseReceived: false,
      parseSuccess: true,
      mappingSuccessCount: snapshot.length,
      mappingFailCount: 0,
    }
  }

  if (!APP_CONFIG.nec.apiKey) {
    return {
      records: snapshot,
      sourceType: 'snapshot',
      fallbackReason: 'missing_api_key',
      requestedAt,
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      mappingSuccessCount: 0,
      mappingFailCount: 0,
    }
  }

  if (!APP_CONFIG.nec.path.trim()) {
    return {
      records: snapshot,
      sourceType: 'snapshot',
      fallbackReason: 'missing_path',
      requestedAt,
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      mappingSuccessCount: 0,
      mappingFailCount: 0,
    }
  }

  const url = buildRuntimeUrl(APP_CONFIG.nec.baseUrl, APP_CONFIG.nec.path)
  url.searchParams.set('serviceKey', APP_CONFIG.nec.apiKey)
  url.searchParams.set('numOfRows', '500')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('_type', 'json')

  try {
    const response = await fetch(url.toString())
    const statusCode = response.status
    const text = await response.text()

    if (isDev) {
      console.log('[election:town:request]', {
        townCode,
        requestUrl: url.toString(),
        statusCode,
        preview: text.slice(0, 220),
      })
    }

    if (!response.ok) {
      return {
        records: snapshot,
        sourceType: 'snapshot',
        fallbackReason:
          statusCode === 401 || statusCode === 403
            ? 'approval_required'
            : statusCode === 404
              ? 'not_found'
              : 'server_error',
        requestUrl: url.toString(),
        statusCode,
        requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: false,
        mappingSuccessCount: 0,
        mappingFailCount: 0,
      }
    }

    let rawRecords: RawElectionRecord[] = []
    try {
      rawRecords = text.trim().startsWith('<') ? parseXmlItems(text) : parseJsonPayload(JSON.parse(text))
    } catch {
      return {
        records: snapshot,
        sourceType: 'snapshot',
        fallbackReason: 'parse_error',
        requestUrl: url.toString(),
        statusCode,
        requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: false,
        mappingSuccessCount: 0,
        mappingFailCount: 0,
      }
    }

    const mapped = mapRecordsToTownCodes(rawRecords, boundaries)
    const targetTownRecords = mapped.normalized.filter((record) => record.adminCode === townCode)

    if (isDev) {
      console.log('[election:town:normalized]', {
        townCode,
        sourceType: targetTownRecords.length ? 'real' : 'snapshot',
        requestUrl: url.toString(),
        normalizedElectionResultCount: targetTownRecords.length,
        mappingSuccessCount: mapped.mappingSuccessCount,
        mappingFailCount: mapped.mappingFailCount,
        firstRecord: targetTownRecords[0] ?? null,
      })
    }

    return {
      records: targetTownRecords.length ? targetTownRecords : snapshot,
      sourceType: targetTownRecords.length ? 'real' : 'snapshot',
      fallbackReason: targetTownRecords.length ? 'none' : 'empty_result',
      requestUrl: url.toString(),
      statusCode,
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: targetTownRecords.length > 0,
      mappingSuccessCount: mapped.mappingSuccessCount,
      mappingFailCount: mapped.mappingFailCount,
    }
  } catch (error) {
    if (isDev) {
      console.warn('[election:town:fallback]', error)
    }

    return {
      records: snapshot,
      sourceType: 'snapshot',
      fallbackReason: 'network_error',
      requestUrl: url.toString(),
      requestedAt,
      requestSent: true,
      responseReceived: false,
      parseSuccess: false,
      mappingSuccessCount: 0,
      mappingFailCount: 0,
    }
  }
}
