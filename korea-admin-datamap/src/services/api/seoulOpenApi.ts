import { APP_CONFIG } from '@/config/app'

const DEFAULT_SEOUL_OPEN_API_BASE_URL = 'http://openapi.seoul.go.kr:8088'
const SEOUL_API_KEY = import.meta.env.VITE_SEOUL_OPEN_API_KEY

if (import.meta.env.DEV && !SEOUL_API_KEY) {
  console.warn('SEOUL OPEN API KEY missing')
}

const getSeoulOpenApiBaseUrl = () =>
  APP_CONFIG.seoulOpenApiBaseUrl || DEFAULT_SEOUL_OPEN_API_BASE_URL

export const hasSeoulOpenApiConfig = () => Boolean(SEOUL_API_KEY)

interface FetchSeoulOpenDataOptions<T> {
  path: string
  normalizer: (payload: unknown) => T
}

export const fetchSeoulOpenData = async <T>({
  path,
  normalizer,
}: FetchSeoulOpenDataOptions<T>): Promise<T | null> => {
  if (!hasSeoulOpenApiConfig()) {
    return null
  }

  const url = new URL(
    `/${SEOUL_API_KEY}/json/${path.replace(/^\/+/, '')}`,
    getSeoulOpenApiBaseUrl(),
  )

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Seoul Open API request failed: ${response.status}`)
  }

  const payload = await response.json()
  return normalizer(payload)
}
