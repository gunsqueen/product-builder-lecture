import proj4 from 'proj4'
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import type { BoundaryCollection, BoundaryFeature, AdminLevel } from '../../types/admin'
import { getCityBySgisCode, getProvinceByCode, getProvinceBySgisCode, getTownBySgisCode } from '../../utils/adminLookup'

proj4.defs(
  'EPSG:5179',
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
)

const runtimeOrigin = () => (typeof window === 'undefined' ? 'http://localhost' : window.location.origin)

const buildApiUrl = (baseUrl: string, path: string) => {
  const base = baseUrl.trim()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (/^https?:\/\//.test(base)) {
    return new URL(normalizedPath, base)
  }

  const normalizedBase = base ? (base.startsWith('/') ? base : `/${base}`) : ''
  return new URL(`${normalizedBase}${normalizedPath}`, runtimeOrigin())
}

const transformCoordinates = (value: unknown): unknown => {
  if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    if (Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90) {
      return value
    }
    const [lng, lat] = proj4('EPSG:5179', 'EPSG:4326', [value[0], value[1]])
    return [lng, lat, ...value.slice(2)]
  }

  if (Array.isArray(value)) {
    return value.map(transformCoordinates)
  }

  return value
}

const toDisplayName = (name: string, level: AdminLevel) => {
  if (level === 'province') {
    return name
  }

  const segments = name.split(' ').filter(Boolean)
  return segments.at(-1) ?? name
}

const normalizeAdminCode = (code: string, level: AdminLevel) => {
  if (level === 'province') {
    return getProvinceBySgisCode(code)?.adminCode ?? code
  }

  if (level === 'city') {
    return getCityBySgisCode(code)?.adminCode ?? code
  }

  if (level === 'town') {
    return getTownBySgisCode(code)?.adminCode ?? code
  }

  return code
}

const normalizeCollection = (
  collection: FeatureCollection<Geometry, GeoJsonProperties>,
  level: AdminLevel,
  parentCode?: string,
): BoundaryCollection => {
  const features: BoundaryFeature[] = []

  collection.features.forEach((feature) => {
      const code = String(feature.properties?.adm_cd ?? '').trim()
      const name = String(feature.properties?.adm_nm ?? '').trim()

      if (!feature.geometry || !code || !name) {
        if (import.meta.env.DEV) {
          console.warn(`[sgis:${level}] skipped feature`, {
            code,
            name,
            hasGeometry: Boolean(feature.geometry),
          })
        }
        return
      }

      features.push({
        type: 'Feature',
        geometry: {
          ...feature.geometry,
          ...(feature.geometry.type === 'GeometryCollection'
            ? {}
            : { coordinates: transformCoordinates((feature.geometry as Geometry & { coordinates: unknown }).coordinates) as never }),
        },
        properties: {
          adminCode: normalizeAdminCode(code, level),
          name: toDisplayName(name, level),
          level,
          parentCode,
          fullName: name,
        },
      })
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

const SGIS_SERVICE_ID = import.meta.env.VITE_SGIS_SERVICE_ID
const SGIS_SECURITY_KEY = import.meta.env.VITE_SGIS_SECURITY_KEY
const SGIS_BASE_URL = import.meta.env.VITE_SGIS_API_BASE_URL || '/api/sgis'
const SGIS_AUTH_PATH = import.meta.env.VITE_SGIS_AUTH_PATH || '/OpenAPI3/auth/authentication.json'
const SGIS_BOUNDARY_PATH = import.meta.env.VITE_SGIS_BOUNDARY_PATH || '/OpenAPI3/boundary/hadmarea.geojson'
const SGIS_BOUNDARY_YEAR = import.meta.env.VITE_SGIS_BOUNDARY_YEAR || '2025'

const fetchAccessToken = async () => {
  if (!SGIS_SERVICE_ID || !SGIS_SECURITY_KEY) {
    throw new Error('SGIS 환경변수가 없습니다. .env.local을 확인하세요.')
  }

  const authUrl = buildApiUrl(SGIS_BASE_URL, SGIS_AUTH_PATH)
  authUrl.searchParams.set('consumer_key', SGIS_SERVICE_ID)
  authUrl.searchParams.set('consumer_secret', SGIS_SECURITY_KEY)

  const authResponse = await fetch(authUrl.toString())
  if (!authResponse.ok) {
    throw new Error(`SGIS auth failed: ${authResponse.status}`)
  }

  const authPayload = (await authResponse.json()) as {
    result?: { accessToken?: string }
    errMsg?: string
  }
  const accessToken = authPayload.result?.accessToken

  if (!accessToken) {
    throw new Error(`SGIS auth token missing: ${authPayload.errMsg ?? 'unknown error'}`)
  }

  return accessToken
}

const fetchBoundaryCollection = async (
  level: AdminLevel,
  params?: Record<string, string>,
): Promise<{ collection: BoundaryCollection; requestUrl: string }> => {
  const accessToken = await fetchAccessToken()

  const boundaryUrl = buildApiUrl(SGIS_BASE_URL, SGIS_BOUNDARY_PATH)
  boundaryUrl.searchParams.set('accessToken', accessToken)
  boundaryUrl.searchParams.set('year', SGIS_BOUNDARY_YEAR)
  Object.entries(params ?? {}).forEach(([key, value]) => boundaryUrl.searchParams.set(key, value))

  const boundaryResponse = await fetch(boundaryUrl.toString())
  if (!boundaryResponse.ok) {
    throw new Error(`SGIS boundary failed: ${boundaryResponse.status}`)
  }

  const rawCollection = (await boundaryResponse.json()) as FeatureCollection<Geometry, GeoJsonProperties>
  const normalized = normalizeCollection(rawCollection, level, params?.adm_cd)

  if (import.meta.env.DEV) {
    const geometryTypes = [...new Set(normalized.features.map((feature) => feature.geometry.type))]
    console.log(`[sgis:${level}]`, {
      requestUrl: boundaryUrl.toString(),
      responseStatus: boundaryResponse.status,
      sourceType: 'real',
      rawFeatureCount: rawCollection.features.length,
      featureCount: normalized.features.length,
      skippedCount: rawCollection.features.length - normalized.features.length,
      geometryTypes,
      firstFeatureSample: normalized.features.slice(0, 1).map((feature) => ({
        adminCode: feature.properties.adminCode,
        name: feature.properties.name,
        fullName: feature.properties.fullName,
        geometryType: feature.geometry.type,
      })),
    })
  }

  return {
    collection: normalized,
    requestUrl: boundaryUrl.toString(),
  }
}

export const fetchProvinceBoundaries = async (): Promise<{ collection: BoundaryCollection; requestUrl: string }> => {
  return fetchBoundaryCollection('province')
}

export const fetchCityBoundaries = async (
  provinceCode: string,
): Promise<{ collection: BoundaryCollection; requestUrl: string }> => {
  const province = getProvinceByCode(provinceCode)
  return fetchBoundaryCollection('city', {
    adm_cd: province?.sgisCode ?? provinceCode,
    low_search: '1',
  })
}

export const fetchTownBoundaries = async (
  cityCode: string,
): Promise<{ collection: BoundaryCollection; requestUrl: string }> => {
  return fetchBoundaryCollection('town', {
    adm_cd: cityCode,
    low_search: '1',
  })
}
