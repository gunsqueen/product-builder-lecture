export type DataMode = 'real' | 'snapshot' | 'mock'
export type SourceType = 'real' | 'snapshot' | 'mock'
export type SourceKey = 'boundary' | 'population' | 'election'
export type FallbackReason =
  | 'none'
  | 'missing_api_key'
  | 'missing_path'
  | 'missing_snapshot'
  | 'approval_required'
  | 'not_found'
  | 'server_error'
  | 'parse_error'
  | 'empty_result'
  | 'join_failed'
  | 'network_error'

const env = import.meta.env

export const APP_CONFIG = {
  dataMode: (env.VITE_DATA_MODE ?? 'real') as DataMode,
  sgis: {
    serviceId: env.VITE_SGIS_SERVICE_ID ?? '',
    securityKey: env.VITE_SGIS_SECURITY_KEY ?? '',
    baseUrl: env.VITE_SGIS_API_BASE_URL ?? '/api/sgis',
    authPath: env.VITE_SGIS_AUTH_PATH ?? '/OpenAPI3/auth/authentication.json',
    boundaryPath: env.VITE_SGIS_BOUNDARY_PATH ?? '/OpenAPI3/boundary/hadmarea.geojson',
    boundaryYear: env.VITE_SGIS_BOUNDARY_YEAR ?? '2025',
  },
  mois: {
    apiKey: env.VITE_MOIS_API_KEY ?? '',
    baseUrl: env.VITE_MOIS_API_BASE_URL ?? '/api/mois',
    path: env.VITE_MOIS_API_PATH ?? '',
  },
  nec: {
    apiKey: env.VITE_NEC_API_KEY ?? '',
    baseUrl: env.VITE_NEC_API_BASE_URL ?? '/api/nec',
    path: env.VITE_NEC_API_PATH ?? '',
  },
} as const

export const isDev = import.meta.env.DEV
