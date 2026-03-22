import type { FallbackReason, SourceKey, SourceType } from '../config/app'

export interface DataSourceStatus {
  sourceKey: SourceKey
  currentSourceType: SourceType
  requestedMode: 'real' | 'snapshot' | 'mock'
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
  normalizerSuccess: boolean
  normalizedItemCount: number
  statusCode?: number
  requestUrl?: string
  fallbackReason: FallbackReason
  selectedSourceReason: string
  lastRequestTimestamp: string
}
