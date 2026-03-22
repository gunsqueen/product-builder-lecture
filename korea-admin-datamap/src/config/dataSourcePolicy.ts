import type { DataSourceMode } from '@/types/admin'
import type { DataSourceDomain, FallbackReasonCode, RuntimeSourceType } from '@/types/dataSource'

type SourcePriority = Record<DataSourceMode, RuntimeSourceType[]>

export const DATA_SOURCE_POLICY: Record<DataSourceDomain, SourcePriority> = {
  population: {
    mock: ['mock'],
    snapshot: ['snapshot', 'mock'],
    real: ['real', 'snapshot', 'mock'],
  },
  election: {
    mock: ['mock'],
    snapshot: ['snapshot', 'mock'],
    real: ['real', 'snapshot', 'mock'],
  },
  boundary: {
    mock: ['snapshot'],
    snapshot: ['snapshot'],
    real: ['real', 'snapshot'],
  },
  'seoul-open': {
    mock: ['snapshot'],
    snapshot: ['snapshot'],
    real: ['real', 'snapshot'],
  },
}

export const FALLBACK_REASON_LABELS: Record<FallbackReasonCode, string> = {
  missing_api_key: 'API 키 없음',
  missing_path: '엔드포인트 path 없음',
  missing_credentials: '인증 정보 없음',
  missing_profile: '요청 프로필 없음',
  approval_required: '승인 필요',
  forbidden: '접근 거부',
  not_found: '엔드포인트 없음',
  server_error: '서버 오류',
  parse_error: '응답 파싱 실패',
  empty_result: '응답 데이터 없음',
  auth_failed: '인증 실패',
  network_error: '네트워크 오류',
  api_error: 'API 오류',
  unknown_error: '알 수 없는 오류',
}

export const getSourcePriority = (
  domain: DataSourceDomain,
  mode: DataSourceMode,
) => DATA_SOURCE_POLICY[domain][mode]

export const getFallbackSourceLabel = (domain: DataSourceDomain, mode: DataSourceMode) =>
  getSourcePriority(domain, mode).slice(1).join(' -> ') || 'none'

export const formatFallbackReasonLabel = (reasonCode?: FallbackReasonCode) =>
  reasonCode ? FALLBACK_REASON_LABELS[reasonCode] : '없음'

export const resolveFallbackReasonCode = (
  statusCode?: number,
): FallbackReasonCode => {
  if (statusCode === 403) {
    return 'approval_required'
  }

  if (statusCode === 404) {
    return 'not_found'
  }

  if (statusCode && statusCode >= 500) {
    return 'server_error'
  }

  return 'api_error'
}
