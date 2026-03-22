import { APP_CONFIG } from '@/config/app'
import { getSourcePriority } from '@/config/dataSourcePolicy'
import {
  loadCityBoundarySnapshot,
  loadProvinceBoundarySnapshot,
  loadTownBoundarySnapshot,
} from '@/data/snapshot/boundaries'
import {
  getCityCatalog,
  getProvinceCatalog,
  getTownCatalog,
} from '@/services/adminService'
import {
  fetchCityBoundariesFromApi,
  fetchProvinceBoundariesFromApi,
  fetchTownBoundariesFromApi,
  hasSgisApiConfig,
} from '@/services/api/sgisApi'
import type {
  BoundaryFeatureCollection,
  CityCode,
  ProvinceCode,
} from '@/types/admin'
import type { FallbackReasonCode } from '@/types/dataSource'
import {
  logAdminJoinValidation,
  validateBoundaryAdminJoin,
} from '@/utils/joinValidator'
import { logDataSourceEvent } from '@/utils/dataSourceLogger'

const asFallbackReasonCode = (value: unknown): FallbackReasonCode | undefined =>
  typeof value === 'string' ? (value as FallbackReasonCode) : undefined

const logBoundaryCatalogJoin = (
  boundaryName: string,
  boundaries: BoundaryFeatureCollection | null,
  adminRecords: Array<{ code: string; parentCode?: string }>,
) => {
  logAdminJoinValidation(
    validateBoundaryAdminJoin({
      boundaryName,
      boundaries,
      contextLabel: APP_CONFIG.dataSourceMode,
      adminRecords,
    }),
  )
}

export const getProvinceBoundaries = async () => {
  let boundaries: BoundaryFeatureCollection | null = null
  let realFailure:
    | {
        detail: string
        statusCode?: number
        requestUrl?: string
        requestedAt?: string
        fallbackReason?: string
        fallbackReasonCode?: FallbackReasonCode
        requestSent?: boolean
        responseReceived?: boolean
        parseSuccess?: boolean
        responsePreview?: string
        selectedSourceReason?: string
      }
    | undefined

  if (APP_CONFIG.dataSourceMode === 'real') {
    if (!hasSgisApiConfig()) {
      boundaries = await loadProvinceBoundarySnapshot()
      logDataSourceEvent({
        domain: 'boundary',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: boundaries?.metadata?.sourceType ?? 'snapshot',
        geometrySource: boundaries?.metadata?.geometrySource,
        status: 'fallback',
        detail: 'SGIS credentials are missing. Using snapshot province boundaries.',
        count: boundaries?.features.length ?? 0,
        fallbackReason: 'SGIS credentials are missing.',
        fallbackReasonCode: 'missing_credentials',
      })
    } else {
      try {
        const apiResult = await fetchProvinceBoundariesFromApi()
        boundaries = apiResult?.collection ?? null
        if (boundaries) {
          logDataSourceEvent({
            domain: 'boundary',
            requestedMode: APP_CONFIG.dataSourceMode,
            sourceType: 'real',
            geometrySource: boundaries.metadata?.geometrySource,
            status: 'selected',
            detail: 'Using SGIS province boundaries.',
            count: boundaries.features.length,
            statusCode: apiResult?.statusCode,
            requestUrl: apiResult?.requestUrl,
            requestedAt: apiResult?.requestedAt,
            fallbackReasonCode: asFallbackReasonCode(apiResult?.fallbackReasonCode),
            requestSent: apiResult?.requestSent,
            responseReceived: apiResult?.responseReceived,
            parseSuccess: apiResult?.parseSuccess,
            responsePreview: apiResult?.responsePreview,
            selectedSourceReason: apiResult?.selectedSourceReason,
          })
        } else if (apiResult?.fallbackReason) {
          realFailure = {
            detail: apiResult.fallbackReason,
            statusCode: apiResult.statusCode,
            requestUrl: apiResult.requestUrl,
            requestedAt: apiResult.requestedAt,
            fallbackReason: apiResult.fallbackReason,
            fallbackReasonCode: asFallbackReasonCode(apiResult.fallbackReasonCode),
            requestSent: apiResult.requestSent,
            responseReceived: apiResult.responseReceived,
            parseSuccess: apiResult.parseSuccess,
            responsePreview: apiResult.responsePreview,
            selectedSourceReason: apiResult.selectedSourceReason,
          }
        }
      } catch (error) {
        realFailure = {
          detail: error instanceof Error ? error.message : 'Unknown SGIS API error',
          statusCode:
            typeof error === 'object' && error && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : undefined,
          requestUrl:
            typeof error === 'object' && error && 'requestUrl' in error
              ? String((error as { requestUrl?: string }).requestUrl)
              : undefined,
          requestedAt:
            typeof error === 'object' && error && 'requestedAt' in error
              ? String((error as { requestedAt?: string }).requestedAt)
              : undefined,
          fallbackReasonCode: 'unknown_error',
          requestSent:
            typeof error === 'object' && error && 'requestSent' in error
              ? Boolean((error as { requestSent?: boolean }).requestSent)
              : true,
          responseReceived:
            typeof error === 'object' && error && 'responseReceived' in error
              ? Boolean((error as { responseReceived?: boolean }).responseReceived)
              : undefined,
          parseSuccess:
            typeof error === 'object' && error && 'parseSuccess' in error
              ? Boolean((error as { parseSuccess?: boolean }).parseSuccess)
              : undefined,
          responsePreview:
            typeof error === 'object' && error && 'responsePreview' in error
              ? String((error as { responsePreview?: string }).responsePreview)
              : undefined,
          selectedSourceReason: 'SGIS province real request failed before selection.',
        }
      }
    }
  }

  if (!boundaries) {
    boundaries = await loadProvinceBoundarySnapshot()
    logDataSourceEvent({
      domain: 'boundary',
      requestedMode: APP_CONFIG.dataSourceMode,
      sourceType: boundaries?.metadata?.sourceType ?? 'snapshot',
      geometrySource: boundaries?.metadata?.geometrySource,
      status: realFailure ? 'fallback' : 'selected',
      detail: realFailure?.detail ??
        (APP_CONFIG.dataSourceMode === 'mock'
          ? 'Using local snapshot province boundaries in mock mode.'
          : `Using snapshot province boundaries. Policy: ${getSourcePriority('boundary', APP_CONFIG.dataSourceMode).join(' -> ')}`),
      selectedSourceReason:
        realFailure?.selectedSourceReason ??
        'snapshot province boundaries were selected.',
      count: boundaries?.features.length ?? 0,
      statusCode: realFailure?.statusCode,
      requestUrl: realFailure?.requestUrl,
      requestedAt: realFailure?.requestedAt,
      fallbackReason: realFailure?.fallbackReason,
      fallbackReasonCode: realFailure?.fallbackReasonCode,
      requestSent: realFailure?.requestSent,
      responseReceived: realFailure?.responseReceived,
      parseSuccess: realFailure?.parseSuccess,
      responsePreview: realFailure?.responsePreview,
    })
  }

  logBoundaryCatalogJoin(
    'province-boundaries',
    boundaries,
    getProvinceCatalog().map((province) => ({ code: province.code })),
  )

  return boundaries
}

export const getCityBoundaries = async (provinceCode: ProvinceCode) => {
  let boundaries: BoundaryFeatureCollection | null = null
  let realFailure:
    | {
        detail: string
        statusCode?: number
        requestUrl?: string
        requestedAt?: string
        fallbackReason?: string
        fallbackReasonCode?: FallbackReasonCode
        requestSent?: boolean
        responseReceived?: boolean
        parseSuccess?: boolean
        responsePreview?: string
        selectedSourceReason?: string
      }
    | undefined

  if (APP_CONFIG.dataSourceMode === 'real') {
    if (!hasSgisApiConfig()) {
      boundaries = await loadCityBoundarySnapshot(provinceCode)
      logDataSourceEvent({
        domain: 'boundary',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: boundaries?.metadata?.sourceType ?? 'snapshot',
        geometrySource: boundaries?.metadata?.geometrySource,
        status: 'fallback',
        detail: 'SGIS credentials are missing. Using snapshot city boundaries.',
        adminCode: provinceCode,
        count: boundaries?.features.length ?? 0,
        fallbackReason: 'SGIS credentials are missing.',
        fallbackReasonCode: 'missing_credentials',
      })
    } else {
      try {
        const apiResult = await fetchCityBoundariesFromApi(provinceCode)
        boundaries = apiResult?.collection ?? null
        if (boundaries) {
          logDataSourceEvent({
            domain: 'boundary',
            requestedMode: APP_CONFIG.dataSourceMode,
            sourceType: 'real',
            geometrySource: boundaries.metadata?.geometrySource,
            status: 'selected',
            detail: 'Using SGIS city boundaries.',
            adminCode: provinceCode,
            count: boundaries.features.length,
            statusCode: apiResult?.statusCode,
            requestUrl: apiResult?.requestUrl,
            requestedAt: apiResult?.requestedAt,
            fallbackReasonCode: asFallbackReasonCode(apiResult?.fallbackReasonCode),
            requestSent: apiResult?.requestSent,
            responseReceived: apiResult?.responseReceived,
            parseSuccess: apiResult?.parseSuccess,
            responsePreview: apiResult?.responsePreview,
            selectedSourceReason: apiResult?.selectedSourceReason,
          })
        } else if (apiResult?.fallbackReason) {
          realFailure = {
            detail: apiResult.fallbackReason,
            statusCode: apiResult.statusCode,
            requestUrl: apiResult.requestUrl,
            requestedAt: apiResult.requestedAt,
            fallbackReason: apiResult.fallbackReason,
            fallbackReasonCode: asFallbackReasonCode(apiResult.fallbackReasonCode),
            requestSent: apiResult.requestSent,
            responseReceived: apiResult.responseReceived,
            parseSuccess: apiResult.parseSuccess,
            responsePreview: apiResult.responsePreview,
            selectedSourceReason: apiResult.selectedSourceReason,
          }
        }
      } catch (error) {
        realFailure = {
          detail: error instanceof Error ? error.message : 'Unknown SGIS API error',
          statusCode:
            typeof error === 'object' && error && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : undefined,
          requestUrl:
            typeof error === 'object' && error && 'requestUrl' in error
              ? String((error as { requestUrl?: string }).requestUrl)
              : undefined,
          requestedAt:
            typeof error === 'object' && error && 'requestedAt' in error
              ? String((error as { requestedAt?: string }).requestedAt)
              : undefined,
          fallbackReasonCode: 'unknown_error',
          requestSent:
            typeof error === 'object' && error && 'requestSent' in error
              ? Boolean((error as { requestSent?: boolean }).requestSent)
              : true,
          responseReceived:
            typeof error === 'object' && error && 'responseReceived' in error
              ? Boolean((error as { responseReceived?: boolean }).responseReceived)
              : undefined,
          parseSuccess:
            typeof error === 'object' && error && 'parseSuccess' in error
              ? Boolean((error as { parseSuccess?: boolean }).parseSuccess)
              : undefined,
          responsePreview:
            typeof error === 'object' && error && 'responsePreview' in error
              ? String((error as { responsePreview?: string }).responsePreview)
              : undefined,
          selectedSourceReason: 'SGIS city real request failed before selection.',
        }
      }
    }
  }

  if (!boundaries) {
    boundaries = await loadCityBoundarySnapshot(provinceCode)
    logDataSourceEvent({
      domain: 'boundary',
      requestedMode: APP_CONFIG.dataSourceMode,
      sourceType: boundaries?.metadata?.sourceType ?? 'snapshot',
      geometrySource: boundaries?.metadata?.geometrySource,
      status: boundaries ? (realFailure ? 'fallback' : 'selected') : 'fallback',
      detail: boundaries
        ? (realFailure?.detail ?? 'Using snapshot city boundaries.')
        : 'No real or snapshot city boundary geometry is available for this province.',
      selectedSourceReason:
        realFailure?.selectedSourceReason ??
        (boundaries
          ? 'snapshot city boundaries were selected.'
          : 'no usable real or snapshot city geometry was found.'),
      adminCode: provinceCode,
      count: boundaries?.features.length ?? 0,
      statusCode: realFailure?.statusCode,
      requestUrl: realFailure?.requestUrl,
      requestedAt: realFailure?.requestedAt,
      fallbackReason: realFailure?.fallbackReason,
      fallbackReasonCode: realFailure?.fallbackReasonCode ?? (boundaries ? undefined : 'empty_result'),
      requestSent: realFailure?.requestSent,
      responseReceived: realFailure?.responseReceived,
      parseSuccess: realFailure?.parseSuccess,
      responsePreview: realFailure?.responsePreview,
    })
  }

  logBoundaryCatalogJoin(
    `${provinceCode}-city-boundaries`,
    boundaries,
    getCityCatalog()
      .filter((city) => city.provinceCode === provinceCode)
      .map((city) => ({
        code: city.code,
        parentCode: city.provinceCode,
      })),
  )

  return boundaries
}

export const getTownBoundaries = async (cityCode: CityCode) => {
  let boundaries: BoundaryFeatureCollection | null = null
  let realFailure:
    | {
        detail: string
        statusCode?: number
        requestUrl?: string
        requestedAt?: string
        fallbackReason?: string
        fallbackReasonCode?: FallbackReasonCode
        requestSent?: boolean
        responseReceived?: boolean
        parseSuccess?: boolean
        responsePreview?: string
        selectedSourceReason?: string
      }
    | undefined

  if (APP_CONFIG.dataSourceMode === 'real') {
    if (!hasSgisApiConfig()) {
      boundaries = await loadTownBoundarySnapshot(cityCode)
      logDataSourceEvent({
        domain: 'boundary',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: boundaries?.metadata?.sourceType ?? 'snapshot',
        geometrySource: boundaries?.metadata?.geometrySource,
        status: 'fallback',
        detail: 'SGIS credentials are missing. Using snapshot town boundaries.',
        adminCode: cityCode,
        count: boundaries?.features.length ?? 0,
        fallbackReason: 'SGIS credentials are missing.',
        fallbackReasonCode: 'missing_credentials',
      })
    } else {
      try {
        const apiResult = await fetchTownBoundariesFromApi(cityCode)
        boundaries = apiResult?.collection ?? null
        if (boundaries) {
          logDataSourceEvent({
            domain: 'boundary',
            requestedMode: APP_CONFIG.dataSourceMode,
            sourceType: 'real',
            geometrySource: boundaries.metadata?.geometrySource,
            status: 'selected',
            detail: 'Using SGIS town boundaries.',
            adminCode: cityCode,
            count: boundaries.features.length,
            statusCode: apiResult?.statusCode,
            requestUrl: apiResult?.requestUrl,
            requestedAt: apiResult?.requestedAt,
            fallbackReasonCode: asFallbackReasonCode(apiResult?.fallbackReasonCode),
            requestSent: apiResult?.requestSent,
            responseReceived: apiResult?.responseReceived,
            parseSuccess: apiResult?.parseSuccess,
            responsePreview: apiResult?.responsePreview,
            selectedSourceReason: apiResult?.selectedSourceReason,
          })
        } else if (apiResult?.fallbackReason) {
          realFailure = {
            detail: apiResult.fallbackReason,
            statusCode: apiResult.statusCode,
            requestUrl: apiResult.requestUrl,
            requestedAt: apiResult.requestedAt,
            fallbackReason: apiResult.fallbackReason,
            fallbackReasonCode: asFallbackReasonCode(apiResult.fallbackReasonCode),
            requestSent: apiResult.requestSent,
            responseReceived: apiResult.responseReceived,
            parseSuccess: apiResult.parseSuccess,
            responsePreview: apiResult.responsePreview,
            selectedSourceReason: apiResult.selectedSourceReason,
          }
        }
      } catch (error) {
        realFailure = {
          detail: error instanceof Error ? error.message : 'Unknown SGIS API error',
          statusCode:
            typeof error === 'object' && error && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : undefined,
          requestUrl:
            typeof error === 'object' && error && 'requestUrl' in error
              ? String((error as { requestUrl?: string }).requestUrl)
              : undefined,
          requestedAt:
            typeof error === 'object' && error && 'requestedAt' in error
              ? String((error as { requestedAt?: string }).requestedAt)
              : undefined,
          fallbackReasonCode: 'unknown_error',
          requestSent:
            typeof error === 'object' && error && 'requestSent' in error
              ? Boolean((error as { requestSent?: boolean }).requestSent)
              : true,
          responseReceived:
            typeof error === 'object' && error && 'responseReceived' in error
              ? Boolean((error as { responseReceived?: boolean }).responseReceived)
              : undefined,
          parseSuccess:
            typeof error === 'object' && error && 'parseSuccess' in error
              ? Boolean((error as { parseSuccess?: boolean }).parseSuccess)
              : undefined,
          responsePreview:
            typeof error === 'object' && error && 'responsePreview' in error
              ? String((error as { responsePreview?: string }).responsePreview)
              : undefined,
          selectedSourceReason: 'SGIS town real request failed before selection.',
        }
      }
    }
  }

  if (!boundaries) {
    boundaries = await loadTownBoundarySnapshot(cityCode)
    logDataSourceEvent({
      domain: 'boundary',
      requestedMode: APP_CONFIG.dataSourceMode,
      sourceType: boundaries?.metadata?.sourceType ?? 'snapshot',
      geometrySource: boundaries?.metadata?.geometrySource,
      status: boundaries ? (realFailure ? 'fallback' : 'selected') : 'fallback',
      detail: boundaries
        ? (realFailure?.detail ?? 'Using snapshot town boundaries.')
        : 'No real or snapshot town boundary geometry is available for this city.',
      selectedSourceReason:
        realFailure?.selectedSourceReason ??
        (boundaries
          ? 'snapshot town boundaries were selected.'
          : 'no usable real or snapshot town geometry was found.'),
      adminCode: cityCode,
      count: boundaries?.features.length ?? 0,
      statusCode: realFailure?.statusCode,
      requestUrl: realFailure?.requestUrl,
      requestedAt: realFailure?.requestedAt,
      fallbackReason: realFailure?.fallbackReason,
      fallbackReasonCode: realFailure?.fallbackReasonCode ?? (boundaries ? undefined : 'empty_result'),
      requestSent: realFailure?.requestSent,
      responseReceived: realFailure?.responseReceived,
      parseSuccess: realFailure?.parseSuccess,
      responsePreview: realFailure?.responsePreview,
    })
  }

  logBoundaryCatalogJoin(
    `${cityCode}-town-boundaries`,
    boundaries,
    getTownCatalog()
      .filter((town) => town.cityCode === cityCode)
      .map((town) => ({
        code: town.code,
        parentCode: town.cityCode,
      })),
  )

  return boundaries
}

export const loadProvinceBoundaries = () => getProvinceBoundaries()

export const loadCityBoundaries = (provinceCode: ProvinceCode) =>
  getCityBoundaries(provinceCode)

export const loadTownBoundaries = (cityCode: CityCode) =>
  getTownBoundaries(cityCode)
