import { APP_CONFIG } from '@/config/app'
import type { BoundaryGeometrySource, DataSourceMode } from '@/types/admin'
import type {
  DataSourceDomain,
  FallbackReasonCode,
  DataSourceRuntimeSnapshot,
  RuntimeSourceType,
} from '@/types/dataSource'

interface DataSourceLogInput {
  domain: DataSourceDomain
  requestedMode: DataSourceMode
  sourceType: RuntimeSourceType
  geometrySource?: BoundaryGeometrySource
  status: 'selected' | 'fallback' | 'error'
  detail: string
  selectedSourceReason?: string
  adminCode?: string
  count?: number
  statusCode?: number
  requestUrl?: string
  requestedAt?: string
  fallbackReason?: string
  fallbackReasonCode?: FallbackReasonCode
  requestSent?: boolean
  responseReceived?: boolean
  parseSuccess?: boolean
  responsePreview?: string
}

const runtimeSnapshots = new Map<DataSourceDomain, DataSourceRuntimeSnapshot>()

export const getDataSourceRuntimeSnapshot = (domain: DataSourceDomain) =>
  runtimeSnapshots.get(domain)

export const getAllDataSourceRuntimeSnapshots = () => [...runtimeSnapshots.values()]

export const logDataSourceEvent = ({
  domain,
  requestedMode,
  sourceType,
  geometrySource,
  status,
  detail,
  selectedSourceReason,
  adminCode,
  count,
  statusCode,
  requestUrl,
  requestedAt,
  fallbackReason,
  fallbackReasonCode,
  requestSent,
  responseReceived,
  parseSuccess,
  responsePreview,
}: DataSourceLogInput) => {
  runtimeSnapshots.set(domain, {
    key: domain,
    requestedMode,
    currentSourceType: sourceType,
    geometrySource,
    runtimeStatus: status,
    detail,
    selectedSourceReason,
    fallbackReason:
      fallbackReason ?? (status === 'fallback' || status === 'error' ? detail : undefined),
    fallbackReasonCode,
    lastStatusCode: statusCode,
    lastRequestAt: requestedAt ?? new Date().toISOString(),
    lastRequestUrl: requestUrl,
    requestSent,
    responseReceived,
    parseSuccess,
    responsePreview,
  })

  if (!APP_CONFIG.debugDataSources) {
    return
  }

  const tag = `[source:${domain}]`
  const summary = `${tag} mode=${requestedMode} source=${sourceType} geometry=${geometrySource ?? 'unknown'} status=${status}`

  if (status === 'error') {
    console.warn(summary, {
      detail,
      adminCode,
      count,
      statusCode,
      requestUrl,
      fallbackReason,
      fallbackReasonCode,
      requestSent,
      responseReceived,
      parseSuccess,
      responsePreview,
    })
    return
  }

  console.info(summary, {
    detail,
    adminCode,
    count,
    statusCode,
    requestUrl,
    fallbackReason,
    fallbackReasonCode,
    requestSent,
    responseReceived,
    parseSuccess,
    responsePreview,
  })
}
