import type { DataSourceMode } from '@/types/admin'

export const APP_CONFIG = {
  appName: 'Korea Admin Datamap',
  appDescription:
    '대한민국 전국 단위 행정구역 데이터맵을 위한 정적 웹앱 스타터',
  defaultProvinceCode: '11',
  mapCenter: [36.2, 127.8] as [number, number],
  mapZoom: 7,
  dataSourceMode:
    (import.meta.env.VITE_DATA_SOURCE_MODE as DataSourceMode | undefined) ??
    'mock',
  useHashRouter: import.meta.env.VITE_USE_HASH_ROUTER === 'true',
  moisApiKey:
    import.meta.env.VITE_MOIS_API_KEY ?? import.meta.env.VITE_POPULATION_API_KEY,
  moisApiBaseUrl: import.meta.env.VITE_MOIS_API_BASE_URL,
  moisApiPath: import.meta.env.VITE_MOIS_API_PATH,
  necApiKey: import.meta.env.VITE_NEC_API_KEY,
  necApiBaseUrl: import.meta.env.VITE_NEC_API_BASE_URL,
  necApiPath: import.meta.env.VITE_NEC_API_PATH,
  seoulOpenApiKey: import.meta.env.VITE_SEOUL_OPEN_API_KEY,
  seoulOpenApiBaseUrl: import.meta.env.VITE_SEOUL_OPEN_API_BASE_URL,
  sgisServiceId: import.meta.env.VITE_SGIS_SERVICE_ID,
  sgisSecurityKey: import.meta.env.VITE_SGIS_SECURITY_KEY,
  sgisApiBaseUrl: import.meta.env.VITE_SGIS_API_BASE_URL,
  sgisAuthPath: import.meta.env.VITE_SGIS_AUTH_PATH,
  sgisBoundaryPath: import.meta.env.VITE_SGIS_BOUNDARY_PATH,
  sgisBoundaryYear: import.meta.env.VITE_SGIS_BOUNDARY_YEAR ?? '2025',
  enableGeneratedBoundaryFallback:
    import.meta.env.VITE_ENABLE_GENERATED_BOUNDARY_FALLBACK === 'true',
  debugDataSources: import.meta.env.DEV || import.meta.env.VITE_DEBUG_DATA_SOURCES === 'true',
} as const
