import { APP_CONFIG } from '@/config/app'
import {
  formatFallbackReasonLabel,
  getFallbackSourceLabel,
  getSourcePriority,
} from '@/config/dataSourcePolicy'
import { hasElectionApiConfig } from '@/services/api/electionApi'
import { hasPopulationApiConfig } from '@/services/api/populationApi'
import { hasSeoulOpenApiConfig } from '@/services/api/seoulOpenApi'
import { hasSgisApiConfig } from '@/services/api/sgisApi'
import type { BoundaryGeometrySource, DataSourceMode } from '@/types/admin'
import { getDataSourceRuntimeSnapshot } from '@/utils/dataSourceLogger'
import type { DataSourceDomain, FallbackReasonCode } from '@/types/dataSource'

export interface DataSourceStatusItem {
  key: DataSourceDomain
  label: string
  configured: boolean
  requestedMode: DataSourceMode
  preferredSource: 'mock' | 'snapshot' | 'real'
  sourcePriority: string
  fallbackSource: string
  runtimeStatus: 'configured' | 'selected' | 'fallback' | 'error' | 'idle'
  detail: string
  selectedSourceReason?: string
  currentSourceType?: 'mock' | 'snapshot' | 'real'
  geometrySource?: BoundaryGeometrySource
  lastStatusCode?: number
  fallbackReason?: string
  fallbackReasonCode?: FallbackReasonCode
  fallbackReasonLabel: string
  lastRequestAt?: string
  lastRequestUrl?: string
  requestSent?: boolean
  responseReceived?: boolean
  parseSuccess?: boolean
  responsePreview?: string
}

const getStatusFromConfig = (
  label: DataSourceStatusItem['label'],
  key: DataSourceStatusItem['key'],
  configured: boolean,
): DataSourceStatusItem => {
  const runtimeSnapshot = getDataSourceRuntimeSnapshot(key)
  const sourcePriority = getSourcePriority(key, APP_CONFIG.dataSourceMode).join(' -> ')
  const fallbackSource = getFallbackSourceLabel(key, APP_CONFIG.dataSourceMode)

  if (APP_CONFIG.dataSourceMode === 'mock') {
    return {
      key,
      label,
      configured,
      requestedMode: APP_CONFIG.dataSourceMode,
      preferredSource: 'mock',
      sourcePriority,
      fallbackSource,
      runtimeStatus: runtimeSnapshot?.runtimeStatus === 'error' ? 'fallback' : 'idle',
      detail:
        runtimeSnapshot?.detail ?? 'mock 모드로 고정되어 real API를 호출하지 않습니다.',
      selectedSourceReason:
        runtimeSnapshot?.selectedSourceReason ?? 'mock 모드라 local source를 사용합니다.',
      currentSourceType: runtimeSnapshot?.currentSourceType ?? 'mock',
      geometrySource: runtimeSnapshot?.geometrySource,
      lastStatusCode: runtimeSnapshot?.lastStatusCode,
      fallbackReason: runtimeSnapshot?.fallbackReason,
      fallbackReasonCode: runtimeSnapshot?.fallbackReasonCode,
      fallbackReasonLabel: formatFallbackReasonLabel(runtimeSnapshot?.fallbackReasonCode),
      lastRequestAt: runtimeSnapshot?.lastRequestAt,
      lastRequestUrl: runtimeSnapshot?.lastRequestUrl,
      requestSent: runtimeSnapshot?.requestSent,
      responseReceived: runtimeSnapshot?.responseReceived,
      parseSuccess: runtimeSnapshot?.parseSuccess,
      responsePreview: runtimeSnapshot?.responsePreview,
    }
  }

  if (APP_CONFIG.dataSourceMode === 'snapshot') {
    return {
      key,
      label,
      configured,
      requestedMode: APP_CONFIG.dataSourceMode,
      preferredSource: 'snapshot',
      sourcePriority,
      fallbackSource,
      runtimeStatus: runtimeSnapshot?.runtimeStatus === 'error' ? 'fallback' : 'idle',
      detail:
        runtimeSnapshot?.detail ??
        'snapshot 우선 모드입니다. real API 설정이 있어도 호출하지 않습니다.',
      selectedSourceReason:
        runtimeSnapshot?.selectedSourceReason ?? 'snapshot 모드라 정적 데이터를 사용합니다.',
      currentSourceType: runtimeSnapshot?.currentSourceType ?? 'snapshot',
      geometrySource: runtimeSnapshot?.geometrySource,
      lastStatusCode: runtimeSnapshot?.lastStatusCode,
      fallbackReason: runtimeSnapshot?.fallbackReason,
      fallbackReasonCode: runtimeSnapshot?.fallbackReasonCode,
      fallbackReasonLabel: formatFallbackReasonLabel(runtimeSnapshot?.fallbackReasonCode),
      lastRequestAt: runtimeSnapshot?.lastRequestAt,
      lastRequestUrl: runtimeSnapshot?.lastRequestUrl,
      requestSent: runtimeSnapshot?.requestSent,
      responseReceived: runtimeSnapshot?.responseReceived,
      parseSuccess: runtimeSnapshot?.parseSuccess,
      responsePreview: runtimeSnapshot?.responsePreview,
    }
  }

  if (configured) {
    return {
      key,
      label,
      configured,
      requestedMode: APP_CONFIG.dataSourceMode,
      preferredSource: 'real',
      sourcePriority,
      fallbackSource,
      runtimeStatus: runtimeSnapshot?.runtimeStatus ?? 'configured',
      detail:
        runtimeSnapshot?.detail ?? 'real API를 우선 시도하고 실패 시 fallback을 사용합니다.',
      selectedSourceReason:
        runtimeSnapshot?.selectedSourceReason ?? 'real API 결과에 따라 source가 선택됩니다.',
      currentSourceType: runtimeSnapshot?.currentSourceType,
      geometrySource: runtimeSnapshot?.geometrySource,
      lastStatusCode: runtimeSnapshot?.lastStatusCode,
      fallbackReason: runtimeSnapshot?.fallbackReason,
      fallbackReasonCode: runtimeSnapshot?.fallbackReasonCode,
      fallbackReasonLabel: formatFallbackReasonLabel(runtimeSnapshot?.fallbackReasonCode),
      lastRequestAt: runtimeSnapshot?.lastRequestAt,
      lastRequestUrl: runtimeSnapshot?.lastRequestUrl,
      requestSent: runtimeSnapshot?.requestSent,
      responseReceived: runtimeSnapshot?.responseReceived,
      parseSuccess: runtimeSnapshot?.parseSuccess,
      responsePreview: runtimeSnapshot?.responsePreview,
    }
  }

  return {
    key,
    label,
    configured,
    requestedMode: APP_CONFIG.dataSourceMode,
    preferredSource: 'real',
    sourcePriority,
    fallbackSource,
    runtimeStatus: 'fallback',
    detail:
      runtimeSnapshot?.detail ?? 'real 모드지만 환경변수가 없어 fallback만 사용합니다.',
    selectedSourceReason:
      runtimeSnapshot?.selectedSourceReason ?? 'real API 설정이 없어 fallback source를 선택했습니다.',
    currentSourceType:
      runtimeSnapshot?.currentSourceType ??
      (getSourcePriority(key, APP_CONFIG.dataSourceMode)[1] as 'snapshot' | 'mock'),
    geometrySource: runtimeSnapshot?.geometrySource,
    lastStatusCode: runtimeSnapshot?.lastStatusCode,
    fallbackReason: runtimeSnapshot?.fallbackReason,
    fallbackReasonCode: runtimeSnapshot?.fallbackReasonCode,
    fallbackReasonLabel: formatFallbackReasonLabel(runtimeSnapshot?.fallbackReasonCode),
    lastRequestAt: runtimeSnapshot?.lastRequestAt,
    lastRequestUrl: runtimeSnapshot?.lastRequestUrl,
    requestSent: runtimeSnapshot?.requestSent,
    responseReceived: runtimeSnapshot?.responseReceived,
    parseSuccess: runtimeSnapshot?.parseSuccess,
    responsePreview: runtimeSnapshot?.responsePreview,
  }
}

export const getDataSourceStatuses = (): DataSourceStatusItem[] => [
  getStatusFromConfig('Population', 'population', hasPopulationApiConfig()),
  getStatusFromConfig('Election', 'election', hasElectionApiConfig()),
  getStatusFromConfig('Boundary', 'boundary', hasSgisApiConfig()),
  getStatusFromConfig('Seoul Open Data', 'seoul-open', hasSeoulOpenApiConfig()),
]
