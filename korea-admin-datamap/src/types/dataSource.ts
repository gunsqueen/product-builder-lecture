import type {
  BoundaryGeometrySource,
  BoundarySourceType,
  DataSourceMode,
} from '@/types/admin'

export type DataSourceDomain = 'population' | 'election' | 'boundary' | 'seoul-open'
export type RuntimeSourceType = BoundarySourceType
export type DataSourceRuntimeStatus = 'configured' | 'selected' | 'fallback' | 'error' | 'idle'
export type FallbackReasonCode =
  | 'missing_api_key'
  | 'missing_path'
  | 'missing_credentials'
  | 'missing_profile'
  | 'approval_required'
  | 'forbidden'
  | 'not_found'
  | 'server_error'
  | 'parse_error'
  | 'empty_result'
  | 'auth_failed'
  | 'network_error'
  | 'api_error'
  | 'unknown_error'

export interface DataSourceRuntimeSnapshot {
  key: DataSourceDomain
  requestedMode: DataSourceMode
  currentSourceType?: RuntimeSourceType
  geometrySource?: BoundaryGeometrySource
  runtimeStatus?: DataSourceRuntimeStatus
  detail?: string
  selectedSourceReason?: string
  fallbackReason?: string
  fallbackReasonCode?: FallbackReasonCode
  lastStatusCode?: number
  lastRequestAt?: string
  lastRequestUrl?: string
  requestSent?: boolean
  responseReceived?: boolean
  parseSuccess?: boolean
  responsePreview?: string
}

export interface PopulationApiFetchResult {
  records: import('@/types/population').PopulationStats[] | null
  sourceType: RuntimeSourceType
  statusCode?: number
  requestUrl?: string
  requestedAt: string
  fallbackReason?: string
  fallbackReasonCode?: FallbackReasonCode
  requestSent?: boolean
  responseReceived?: boolean
  parseSuccess?: boolean
  responsePreview?: string
  selectedSourceReason?: string
}

export interface ElectionApiFetchResult {
  records: import('@/types/election').ElectionResult[] | null
  sourceType: RuntimeSourceType
  statusCode?: number
  requestUrl?: string
  requestedAt: string
  fallbackReason?: string
  fallbackReasonCode?: FallbackReasonCode
  requestSent?: boolean
  responseReceived?: boolean
  parseSuccess?: boolean
  responsePreview?: string
  selectedSourceReason?: string
}
