import type { AdminCode, AdminLevel } from '@/types/admin'
import type { FallbackReasonCode, PopulationApiFetchResult } from '@/types/dataSource'
import { resolveFallbackReasonCode } from '@/config/dataSourcePolicy'
import {
  buildMoisPopulationRequestUrl,
  fetchPopulationFromMoisApi,
  hasMoisApiConfig,
} from '@/services/api/moisApi'
import type { ApiRequestError } from '@/utils/apiRequestError'

const MOIS_API_KEY = import.meta.env.VITE_MOIS_API_KEY
const MOIS_API_BASE_URL = import.meta.env.VITE_MOIS_API_BASE_URL
const MOIS_API_PATH = import.meta.env.VITE_MOIS_API_PATH

if (import.meta.env.DEV && !MOIS_API_KEY) {
  console.warn('MOIS API KEY missing')
}

export const hasPopulationApiConfig = () =>
  Boolean(hasMoisApiConfig())

export const fetchPopulationFromApi = async (
  adminCode?: AdminCode,
  targetLevel?: AdminLevel,
): Promise<PopulationApiFetchResult> => {
  const requestedAt = new Date().toISOString()

  if (!MOIS_API_KEY) {
    return {
      records: null,
      sourceType: 'snapshot',
      requestedAt,
      fallbackReason: 'MOIS API key is missing.',
      fallbackReasonCode: 'missing_api_key',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      selectedSourceReason: 'API 키가 없어 real request를 보내지 못했습니다.',
    }
  }

  if (!MOIS_API_BASE_URL?.trim() || !MOIS_API_PATH?.trim()) {
    return {
      records: null,
      sourceType: 'snapshot',
      requestedAt,
      fallbackReason:
        'VITE_MOIS_API_BASE_URL 또는 VITE_MOIS_API_PATH 가 비어 있습니다. Snapshot fallback is active.',
      fallbackReasonCode: 'missing_path',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      selectedSourceReason: 'base URL 또는 path 설정이 없어 real request를 보내지 못했습니다.',
    }
  }

  const requestUrl = buildMoisPopulationRequestUrl(adminCode, targetLevel).toString()

  try {
    const apiResult = await fetchPopulationFromMoisApi(adminCode, targetLevel)
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
          ? 'MOIS real response normalized successfully.'
          : 'MOIS real response was received but no normalized records were produced.',
      fallbackReason:
        records && records.length > 0
          ? undefined
          : 'MOIS API returned no records. Snapshot fallback is active.',
      fallbackReasonCode: records && records.length > 0 ? undefined : 'empty_result',
    }
  } catch (error) {
    const apiError = error as ApiRequestError
    const fallbackReasonCode =
      apiError.statusCode
        ? resolveFallbackReasonCode(apiError.statusCode)
        : apiError.message.toLowerCase().includes('failed to fetch')
          ? 'network_error'
          : 'parse_error'
    const fallbackMessages: Partial<Record<FallbackReasonCode, string>> = {
      not_found:
        'MOIS endpoint path returned 404. Check VITE_MOIS_API_BASE_URL and VITE_MOIS_API_PATH.',
      server_error: 'MOIS API server error. Snapshot fallback is active.',
      network_error: 'MOIS API network request failed. Snapshot fallback is active.',
      parse_error: 'MOIS API response could not be parsed. Snapshot fallback is active.',
      api_error: 'MOIS API returned an error. Snapshot fallback is active.',
    }
    const fallbackReason = fallbackMessages[fallbackReasonCode] ?? apiError.message

    if (import.meta.env.DEV) {
      console.warn('[populationApi] real request failed', {
        requestUrl: apiError.requestUrl ?? requestUrl,
        statusCode: apiError.statusCode,
        fallbackReasonCode,
        fallbackReason,
        configuredBaseUrl: MOIS_API_BASE_URL,
        configuredPath: MOIS_API_PATH,
        responsePreview: apiError.responsePreview,
      })
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
      selectedSourceReason: 'MOIS real request failed, so snapshot fallback was selected.',
    }
  }
}
