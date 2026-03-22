import { APP_CONFIG } from '@/config/app'
import {
  resolveElectionApiRequest,
  type ResolvedElectionApiRequest,
} from '@/config/electionApiProfiles'
import type { AdminCode } from '@/types/admin'
import type { ElectionResult, RawElectionInput } from '@/types/election'
import {
  extractApiRecords,
  getApiErrorMessage,
  getApiRecordValue,
  parseApiResponsePayload,
} from '@/utils/apiResponse'
import { createApiRequestError } from '@/utils/apiRequestError'
import { normalizeElectionCollection } from '@/utils/electionNormalizer'

interface NecElectionFetchResult {
  records: ElectionResult[]
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
  responsePreview?: string
}

const DEFAULT_NEC_BASE_URL = 'https://apis.data.go.kr'
const DEFAULT_NEC_PATH = '/9760000/WinnerInfoInqireService2/getWinnerInfoInqire'

const getNecBaseUrl = () => APP_CONFIG.necApiBaseUrl || DEFAULT_NEC_BASE_URL
const getNecPath = () => APP_CONFIG.necApiPath || DEFAULT_NEC_PATH

export const hasNecApiConfig = () => Boolean(APP_CONFIG.necApiKey)

export const buildNecElectionRequestUrl = async (
  electionId: string,
  adminCode?: AdminCode,
) => {
  const requestProfile = await resolveElectionApiRequest(electionId, adminCode)

  if (!requestProfile) {
    return null
  }

  const url = new URL(getNecPath(), getNecBaseUrl())
  url.searchParams.set('serviceKey', APP_CONFIG.necApiKey)
  url.searchParams.set('ServiceKey', APP_CONFIG.necApiKey)
  Object.entries(requestProfile.query).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url
}

const toRawElectionRecord = (
  record: Record<string, unknown>,
  requestProfile: ResolvedElectionApiRequest,
): RawElectionInput => {
  const regionName = String(
    getApiRecordValue(record, ['regionName', 'emdName', 'sggName', 'wiwName', 'sdName']) ?? '',
  )

  return {
    electionId: requestProfile.electionId,
    electionName: String(
      getApiRecordValue(record, ['electionName', 'sgName']) ?? requestProfile.electionName,
    ),
    electionType: String(
      getApiRecordValue(record, ['electionType']) ?? requestProfile.electionType,
    ),
    electionDate: String(
      getApiRecordValue(record, ['electionDate', 'sgDate']) ?? requestProfile.electionDate,
    ),
    regionName,
    adminCode:
      typeof getApiRecordValue(record, ['adminCode', 'adm_cd']) === 'string'
        ? String(getApiRecordValue(record, ['adminCode', 'adm_cd']))
        : undefined,
    adminLevel:
      typeof getApiRecordValue(record, ['adminLevel']) === 'string'
        ? String(getApiRecordValue(record, ['adminLevel']))
        : undefined,
    candidateName: String(
      getApiRecordValue(record, ['candidateName', 'huboNm', 'name']) ?? '알수없음',
    ),
    partyName: String(getApiRecordValue(record, ['partyName', 'jdName']) ?? '무소속'),
    voteCount: getApiRecordValue(record, ['voteCount', 'votCnt']),
    voteRate: getApiRecordValue(record, ['voteRate', 'votPer']),
    totalValidVotes: getApiRecordValue(record, ['totalValidVotes', 'totVotCnt']),
    totalVotes: getApiRecordValue(record, ['totalVotes', 'totVoteCnt']),
    turnoutRate: getApiRecordValue(record, ['turnoutRate', 'turnout']),
    sourceDate: String(
      getApiRecordValue(record, ['sourceDate', 'sgDate']) ?? '1970-01-01',
    ),
    provinceName:
      typeof getApiRecordValue(record, ['provinceName', 'sdName']) === 'string'
        ? String(getApiRecordValue(record, ['provinceName', 'sdName']))
        : undefined,
    cityName:
      typeof getApiRecordValue(record, ['cityName', 'sggName', 'wiwName']) === 'string'
        ? String(getApiRecordValue(record, ['cityName', 'sggName', 'wiwName']))
        : undefined,
    townName:
      typeof getApiRecordValue(record, ['townName', 'emdName']) === 'string'
        ? String(getApiRecordValue(record, ['townName', 'emdName']))
        : undefined,
  }
}

export const fetchElectionResultsFromNecApi = async (
  electionId: string,
  adminCode?: AdminCode,
): Promise<NecElectionFetchResult | null> => {
  if (!hasNecApiConfig()) {
    return null
  }

  const requestProfile = await resolveElectionApiRequest(electionId, adminCode)
  if (!requestProfile) {
    return null
  }

  const url = await buildNecElectionRequestUrl(electionId, adminCode)
  if (!url) {
    return null
  }
  const requestedAt = new Date().toISOString()

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, application/xml, text/xml',
    },
  })

  if (!response.ok) {
    const responsePreview = (await response.text()).slice(0, 500)
    throw createApiRequestError(`NEC API request failed: ${response.status}`, {
      statusCode: response.status,
      requestUrl: url.toString(),
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: false,
      responsePreview,
    })
  }

  const responsePreview = (await response.clone().text()).slice(0, 500)
  let payload: unknown

  try {
    payload = await parseApiResponsePayload(response)
  } catch (error) {
    throw createApiRequestError(
      error instanceof Error ? error.message : 'NEC API parse failed',
      {
        statusCode: response.status,
        requestUrl: url.toString(),
        requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: false,
        responsePreview,
      },
    )
  }

  const apiErrorMessage = getApiErrorMessage(payload)

  if (apiErrorMessage) {
    throw createApiRequestError(`NEC API error: ${apiErrorMessage}`, {
      statusCode: response.status,
      requestUrl: url.toString(),
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: true,
      responsePreview,
    })
  }

  const records = extractApiRecords(payload).map((record) =>
    toRawElectionRecord(record, requestProfile),
  )

  return {
    records: normalizeElectionCollection(records, 'real'),
    requestSent: true,
    responseReceived: true,
    parseSuccess: true,
    responsePreview,
  }
}
