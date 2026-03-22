import type { AdminCode } from '@/types/admin'
import type { ElectionApiFetchResult, FallbackReasonCode } from '@/types/dataSource'
import { resolveFallbackReasonCode } from '@/config/dataSourcePolicy'
import {
  buildNecElectionRequestUrl,
  fetchElectionResultsFromNecApi,
  hasNecApiConfig,
} from '@/services/api/necApi'
import type { ApiRequestError } from '@/utils/apiRequestError'

const NEC_API_KEY = import.meta.env.VITE_NEC_API_KEY
const NEC_API_BASE_URL = import.meta.env.VITE_NEC_API_BASE_URL
const NEC_API_PATH = import.meta.env.VITE_NEC_API_PATH

if (import.meta.env.DEV && !NEC_API_KEY) {
  console.warn('NEC API KEY missing')
}

if (import.meta.env.DEV && (!NEC_API_BASE_URL || !NEC_API_PATH)) {
  console.info(
    '[electionApi] using default NEC endpoint because VITE_NEC_API_BASE_URL or VITE_NEC_API_PATH is not set',
  )
}

export const hasElectionApiConfig = () => hasNecApiConfig()

export const fetchElectionResultsFromApi = async (
  electionId: string,
  adminCode?: AdminCode,
): Promise<ElectionApiFetchResult> => {
  const requestedAt = new Date().toISOString()

  if (!NEC_API_KEY) {
    return {
      records: null,
      sourceType: 'snapshot',
      requestedAt,
      fallbackReason: 'NEC API key is missing.',
      fallbackReasonCode: 'missing_api_key',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      selectedSourceReason: 'API 키가 없어 real request를 보내지 못했습니다.',
    }
  }

  const requestUrl = (await buildNecElectionRequestUrl(electionId, adminCode))?.toString()

  if (!requestUrl) {
    return {
      records: null,
      sourceType: 'snapshot',
      requestedAt,
      fallbackReason: '선거 API 요청 프로필을 만들 수 없습니다. Snapshot fallback을 유지합니다.',
      fallbackReasonCode: 'missing_profile',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      selectedSourceReason: '선거 프로필이 없어 real request를 만들지 못했습니다.',
    }
  }

  try {
    const apiResult = await fetchElectionResultsFromNecApi(electionId, adminCode)
    const records = apiResult?.records ?? null

    return {
      records,
      sourceType: records && records.length > 0 ? 'real' : 'snapshot',
      requestedAt,
      requestUrl,
      statusCode: 200,
      requestSent: apiResult?.requestSent ?? true,
      responseReceived: apiResult?.responseReceived ?? true,
      parseSuccess: apiResult?.parseSuccess ?? true,
      responsePreview: apiResult?.responsePreview,
      selectedSourceReason:
        records && records.length > 0
          ? 'NEC real response normalized successfully.'
          : 'NEC real response was received but no normalized rows were produced.',
      fallbackReason:
        records && records.length > 0
          ? undefined
          : 'NEC API returned no rows. Snapshot fallback is active.',
      fallbackReasonCode: records && records.length > 0 ? undefined : 'empty_result',
    }
  } catch (error) {
    const apiError = error as ApiRequestError
    const fallbackReasonCode =
      apiError.statusCode === 401 || apiError.statusCode === 403
        ? 'approval_required'
        : apiError.statusCode
          ? resolveFallbackReasonCode(apiError.statusCode)
          : apiError.message.toLowerCase().includes('failed to fetch')
            ? 'network_error'
            : 'parse_error'
    const fallbackMessages: Partial<Record<FallbackReasonCode, string>> = {
      approval_required:
        '권한/승인 상태 확인 필요. NEC API는 현재 snapshot fallback을 유지합니다.',
      not_found: 'NEC endpoint path returned 404. Snapshot fallback을 유지합니다.',
      parse_error: 'NEC API response could not be parsed. Snapshot fallback을 유지합니다.',
      empty_result: 'NEC API returned no rows. Snapshot fallback을 유지합니다.',
      server_error: 'NEC API server error. Snapshot fallback을 유지합니다.',
      network_error: 'NEC API network request failed. Snapshot fallback을 유지합니다.',
      api_error: 'NEC API returned an error. Snapshot fallback을 유지합니다.',
    }
    const fallbackReason = fallbackMessages[fallbackReasonCode] ?? apiError.message

    if (import.meta.env.DEV) {
      console.warn(
        fallbackReasonCode === 'approval_required'
          ? '[electionApi] NEC API 403: 권한/승인 상태 확인 필요'
          : '[electionApi] real request failed',
        {
          requestUrl: apiError.requestUrl ?? requestUrl,
          statusCode: apiError.statusCode,
          fallbackReasonCode,
          fallbackReason,
          configuredBaseUrl: NEC_API_BASE_URL,
          configuredPath: NEC_API_PATH,
          responsePreview: apiError.responsePreview,
        },
      )
    }

    return {
      records: null,
      sourceType: 'snapshot',
      requestedAt: apiError.requestedAt ?? requestedAt,
      requestUrl: apiError.requestUrl ?? requestUrl,
      statusCode: apiError.statusCode,
      fallbackReason,
      fallbackReasonCode,
      requestSent: apiError.requestSent ?? true,
      responseReceived: apiError.responseReceived,
      parseSuccess: apiError.parseSuccess,
      responsePreview: apiError.responsePreview,
      selectedSourceReason: 'NEC real request failed, so snapshot fallback was selected.',
    }
  }
}
