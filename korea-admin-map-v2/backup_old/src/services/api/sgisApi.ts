import provinceSnapshot from '../../data/snapshot/province.json'
import seoulCitiesSnapshot from '../../data/snapshot/seoul-cities.json'
import gangseoTownsSnapshot from '../../data/snapshot/gangseo-towns.json'
import { APP_CONFIG, isDev } from '../../config/app'
import { normalizeBoundaryCollection } from '../../utils/boundaryNormalizer'
import { buildRuntimeUrl } from '../../utils/url'
import type { BoundaryFeatureCollection } from '../../types/admin'

interface BoundaryApiResult {
  collection: BoundaryFeatureCollection | null
  sourceType: 'real' | 'snapshot' | 'mock'
  fallbackReason: string
  requestUrl?: string
  statusCode?: number
  requestedAt: string
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
}

const fetchSgisToken = async () => {
  const url = buildRuntimeUrl(APP_CONFIG.sgis.baseUrl, APP_CONFIG.sgis.authPath)
  url.searchParams.set('consumer_key', APP_CONFIG.sgis.serviceId)
  url.searchParams.set('consumer_secret', APP_CONFIG.sgis.securityKey)
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`SGIS auth failed: ${response.status}`)
  const payload = (await response.json()) as { result?: { accessToken?: string } }
  return payload.result?.accessToken ?? ''
}

const fallbackSnapshot = (
  key: 'province' | 'seoul-cities' | 'gangseo-towns',
  adminLevel: 'province' | 'city' | 'town',
  parentCode?: string,
): BoundaryFeatureCollection | null => {
  const raw =
    key === 'province'
      ? (provinceSnapshot as never)
      : key === 'seoul-cities'
        ? (seoulCitiesSnapshot as never)
        : (gangseoTownsSnapshot as never)
  return normalizeBoundaryCollection(raw, {
    adminLevel,
    parentCode,
    sourceType: 'snapshot',
    sourceDate: '2026-03-01',
  })
}

const fetchBoundary = async (
  params: Record<string, string | undefined>,
  snapshotKey: 'province' | 'seoul-cities' | 'gangseo-towns',
  adminLevel: 'province' | 'city' | 'town',
  parentCode?: string,
): Promise<BoundaryApiResult> => {
  const requestedAt = new Date().toISOString()
  const canUseReal =
    APP_CONFIG.dataMode === 'real' && APP_CONFIG.sgis.serviceId && APP_CONFIG.sgis.securityKey

  if (!canUseReal) {
    return {
      collection: fallbackSnapshot(snapshotKey, adminLevel, parentCode),
      sourceType: 'snapshot',
      fallbackReason: 'missing_api_key',
      requestedAt,
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
    }
  }

  try {
    const token = await fetchSgisToken()
    const url = buildRuntimeUrl(APP_CONFIG.sgis.baseUrl, APP_CONFIG.sgis.boundaryPath)
    url.searchParams.set('accessToken', token)
    url.searchParams.set('year', APP_CONFIG.sgis.boundaryYear)
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
    })
    const response = await fetch(url.toString())
    const statusCode = response.status
    const payload = await response.json()

    if (!response.ok) {
      throw new Error(`SGIS request failed: ${statusCode}`)
    }

    const collection = normalizeBoundaryCollection(payload, {
      adminLevel,
      parentCode,
      sourceType: 'real',
      sourceDate: APP_CONFIG.sgis.boundaryYear,
    })

    if (!collection.features.length) {
      return {
        collection: fallbackSnapshot(snapshotKey, adminLevel, parentCode),
        sourceType: 'snapshot',
        fallbackReason: 'empty_result',
        requestUrl: url.toString(),
        statusCode,
        requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: true,
      }
    }

    return {
      collection,
      sourceType: 'real',
      fallbackReason: 'none',
      requestUrl: url.toString(),
      statusCode,
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: true,
    }
  } catch (error) {
    if (isDev) console.warn('[sgis:fallback]', error)
    return {
      collection: fallbackSnapshot(snapshotKey, adminLevel, parentCode),
      sourceType: 'snapshot',
      fallbackReason: 'server_error',
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: false,
    }
  }
}

export const fetchProvinceBoundaries = () => fetchBoundary({}, 'province', 'province')
export const fetchCityBoundaries = (provinceCode: string) =>
  fetchBoundary({ adm_cd: provinceCode, low_search: '1' }, 'seoul-cities', 'city', provinceCode)
export const fetchTownBoundaries = (cityCode: string) =>
  fetchBoundary({ adm_cd: cityCode.slice(0, 2) === '11' ? '11160' : cityCode, low_search: '1' }, 'gangseo-towns', 'town', cityCode)
