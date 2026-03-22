import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import { APP_CONFIG } from '@/config/app'
import { getCityCatalog, getProvinceCatalog, getTownCatalog } from '@/services/adminService'
import type {
  BoundaryFeatureCollection,
  BoundaryLoadResult,
  CityCode,
  ProvinceCode,
} from '@/types/admin'
import {
  createBoundaryLoadResult,
  normalizeBoundaryCollection,
} from '@/utils/boundaryNormalizer'
import {
  createAdminAreaNameAliases,
  normalizeAdminAreaName,
} from '@/utils/adminName'
import { getApiErrorMessage, parseApiResponsePayload } from '@/utils/apiResponse'
import { createApiRequestError } from '@/utils/apiRequestError'

const DEFAULT_SGIS_BASE_URL = 'https://sgisapi.kostat.go.kr'
const DEFAULT_SGIS_AUTH_PATH = '/OpenAPI3/auth/authentication.json'
const DEFAULT_SGIS_BOUNDARY_PATH = '/OpenAPI3/boundary/hadmarea.geojson'
const SGIS_SERVICE_ID = import.meta.env.VITE_SGIS_SERVICE_ID
const SGIS_SECURITY_KEY = import.meta.env.VITE_SGIS_SECURITY_KEY
const SGIS_API_BASE_URL = import.meta.env.VITE_SGIS_API_BASE_URL
const SGIS_AUTH_PATH = import.meta.env.VITE_SGIS_AUTH_PATH
const SGIS_BOUNDARY_PATH = import.meta.env.VITE_SGIS_BOUNDARY_PATH

if (import.meta.env.DEV) {
  if (!SGIS_SERVICE_ID) {
    console.warn('SGIS SERVICE ID missing')
  }

  if (!SGIS_SECURITY_KEY) {
    console.warn('SGIS SECURITY KEY missing')
  }
}

const getSgisBaseUrl = () => SGIS_API_BASE_URL || APP_CONFIG.sgisApiBaseUrl || DEFAULT_SGIS_BASE_URL
const getSgisAuthPath = () => SGIS_AUTH_PATH || APP_CONFIG.sgisAuthPath || DEFAULT_SGIS_AUTH_PATH
const getSgisBoundaryPath = () =>
  SGIS_BOUNDARY_PATH || APP_CONFIG.sgisBoundaryPath || DEFAULT_SGIS_BOUNDARY_PATH

const provinceCatalog = getProvinceCatalog()
const cityCatalog = getCityCatalog()
const townCatalog = getTownCatalog()
const provinceNameByCode = new Map(provinceCatalog.map((province) => [province.code, province.name]))
const provinceByName = new Map(
  provinceCatalog.flatMap((province) =>
    createAdminAreaNameAliases(province.name).map((alias) => [
      normalizeAdminAreaName(alias),
      province,
    ]),
  ),
)
const provinceNameAliases = new Map([
  ['강원도', '51'],
  ['전라북도', '52'],
])
for (const [aliasName, provinceCode] of provinceNameAliases) {
  const province = provinceCatalog.find((item) => item.code === provinceCode)
  if (province) {
    provinceByName.set(normalizeAdminAreaName(aliasName), province)
  }
}
const cityByFullName = new Map<string, (typeof cityCatalog)[number]>()
for (const city of cityCatalog) {
  const provinceName = provinceNameByCode.get(city.provinceCode) ?? ''
  const cityAliases = createAdminAreaNameAliases(city.name)

  cityAliases.forEach((cityAlias) => {
    cityByFullName.set(
      normalizeAdminAreaName(`${provinceName} ${cityAlias}`),
      city,
    )
  })
}
const provinceDisplayNameAliases = new Map([
  ['51', ['강원특별자치도', '강원도']],
  ['52', ['전북특별자치도', '전라북도']],
])
for (const city of cityCatalog) {
  const aliases = provinceDisplayNameAliases.get(city.provinceCode) ?? []
  aliases.forEach((provinceName) => {
    createAdminAreaNameAliases(city.name).forEach((cityAlias) => {
      cityByFullName.set(normalizeAdminAreaName(`${provinceName} ${cityAlias}`), city)
    })
  })
}
const sejongCity = cityCatalog.find((city) => city.code === '36110')
if (sejongCity) {
  cityByFullName.set(normalizeAdminAreaName('세종특별자치시 세종시'), sejongCity)
}
const townByFullName = new Map<string, (typeof townCatalog)[number]>()
for (const town of townCatalog) {
  const provinceName = provinceNameByCode.get(town.provinceCode) ?? ''
  const cityName = cityCatalog.find((city) => city.code === town.cityCode)?.name.trim() ?? ''
  createAdminAreaNameAliases(town.name).forEach((townAlias) => {
    townByFullName.set(
      normalizeAdminAreaName(`${provinceName} ${cityName} ${townAlias}`),
      town,
    )
  })
  const aliases = provinceDisplayNameAliases.get(town.provinceCode) ?? []
  aliases.forEach((provinceName) => {
    createAdminAreaNameAliases(town.name).forEach((townAlias) => {
      townByFullName.set(
        normalizeAdminAreaName(`${provinceName} ${cityName} ${townAlias}`),
        town,
      )
    })
  })
}

let sgisProvinceCodeMapPromise: Promise<Map<ProvinceCode, string>> | null = null
const sgisCityCodeMapByProvince = new Map<ProvinceCode, Promise<Map<CityCode, string>>>()
type RawBoundaryCollection = FeatureCollection<Geometry, GeoJsonProperties>

const createEmptyBoundaryLoadResult = (
  adminLevel: 'province' | 'city' | 'town',
): BoundaryLoadResult =>
  createBoundaryLoadResult(null, {
    adminLevel,
    sourceType: 'real',
    sourceDate: APP_CONFIG.sgisBoundaryYear,
  })

const toResponsePreview = (payload: unknown) => {
  try {
    return JSON.stringify(payload).slice(0, 500)
  } catch {
    return String(payload).slice(0, 500)
  }
}

export const hasSgisApiConfig = () =>
  Boolean(SGIS_SERVICE_ID && SGIS_SECURITY_KEY)

const remapSgisCollectionToOfficialCodes = (
  rawCollection: RawBoundaryCollection,
  adminLevel: 'province' | 'city' | 'town',
) => ({
  ...rawCollection,
  features: rawCollection.features.map((feature) => {
    const properties = { ...(feature.properties ?? {}) }
    const rawName = normalizeAdminAreaName(String(properties.adm_nm ?? '').trim())

    if (adminLevel === 'province') {
      const province = provinceByName.get(rawName)
      if (province) {
        properties.adm_cd = province.code
        properties.adm_nm = province.name
      }
    } else if (adminLevel === 'city') {
      const city = cityByFullName.get(rawName)
      if (city) {
        properties.adm_cd = city.code
        properties.adm_nm = city.name
      }
    } else {
      const town = townByFullName.get(rawName)
      if (town) {
        properties.adm_cd = town.code
        properties.adm_nm = town.name
      }
    }

    return {
      ...feature,
      properties,
    }
  }),
})

export const fetchSgisAccessToken = async () => {
  if (!hasSgisApiConfig()) {
    return null
  }

  const url = new URL(getSgisAuthPath(), getSgisBaseUrl())
  url.searchParams.set('consumer_key', SGIS_SERVICE_ID)
  url.searchParams.set('consumer_secret', SGIS_SECURITY_KEY)
  const requestedAt = new Date().toISOString()

  const response = await fetch(url)

  if (!response.ok) {
    throw createApiRequestError(`SGIS auth request failed: ${response.status}`, {
      statusCode: response.status,
      requestUrl: url.toString(),
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: false,
    })
  }

  const payload = (await response.json()) as {
    errCd?: string
    errMsg?: string
    result?: { accessToken?: string }
  }

  if (payload.errCd && payload.errCd !== '0') {
    throw createApiRequestError(
      `SGIS auth error: ${payload.errCd} ${payload.errMsg ?? ''}`.trim(),
      {
        statusCode: response.status,
        requestUrl: url.toString(),
        requestedAt,
      },
    )
  }

  return payload.result?.accessToken ?? null
}

const fetchBoundaryCollectionFromApi = async (
  adminLevel: 'province' | 'city' | 'town',
  params: Record<string, string | undefined>,
): Promise<BoundaryLoadResult | null> => {
  const token = await fetchSgisAccessToken()

  if (!token) {
    return {
      ...createEmptyBoundaryLoadResult(adminLevel),
      requestedAt: new Date().toISOString(),
      fallbackReason: 'SGIS access token could not be issued.',
      fallbackReasonCode: 'auth_failed',
      requestSent: true,
      responseReceived: false,
      parseSuccess: false,
      selectedSourceReason: 'SGIS auth failed before boundary request could be sent.',
    }
  }

  const url = new URL(getSgisBoundaryPath(), getSgisBaseUrl())
  url.searchParams.set('accessToken', token)
  url.searchParams.set('year', APP_CONFIG.sgisBoundaryYear)
  const requestedAt = new Date().toISOString()

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url)

  if (!response.ok) {
    const responsePreview = (await response.text()).slice(0, 500)
    throw createApiRequestError(`SGIS boundary request failed: ${response.status}`, {
      statusCode: response.status,
      requestUrl: url.toString(),
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: false,
      responsePreview,
    })
  }

  const payload = await parseApiResponsePayload(response)
  const apiErrorMessage = getApiErrorMessage(payload)

  if (apiErrorMessage) {
    throw createApiRequestError(`SGIS boundary API error: ${apiErrorMessage}`, {
      statusCode: response.status,
      requestUrl: url.toString(),
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: true,
      responsePreview: toResponsePreview(payload),
    })
  }

  const candidatePayload = payload as
    | BoundaryFeatureCollection
    | { result?: BoundaryFeatureCollection }
    | { features?: BoundaryFeatureCollection['features'] }

  let rawCollection: BoundaryFeatureCollection | null = null

  if (candidatePayload && typeof candidatePayload === 'object' && 'type' in candidatePayload) {
    rawCollection = candidatePayload
  } else if (
    candidatePayload &&
    typeof candidatePayload === 'object' &&
    'result' in candidatePayload &&
    candidatePayload.result
  ) {
    rawCollection = candidatePayload.result
  } else if (
    candidatePayload &&
    typeof candidatePayload === 'object' &&
    'features' in candidatePayload &&
    candidatePayload.features
  ) {
    rawCollection = {
      type: 'FeatureCollection',
      features: candidatePayload.features,
    }
  }

  if (!rawCollection) {
    return {
      ...createEmptyBoundaryLoadResult(adminLevel),
      statusCode: response.status,
      requestUrl: url.toString(),
      requestedAt,
      fallbackReason: 'SGIS response did not include a boundary collection.',
      fallbackReasonCode: 'empty_result',
      requestSent: true,
      responseReceived: true,
      parseSuccess: true,
      responsePreview: toResponsePreview(payload),
      selectedSourceReason: 'SGIS response was received but no boundary collection could be extracted.',
    }
  }

  const remappedCollection = remapSgisCollectionToOfficialCodes(rawCollection, adminLevel)
  const collection = normalizeBoundaryCollection(remappedCollection, {
    adminLevel,
    sourceType: 'real',
    sourceDate: APP_CONFIG.sgisBoundaryYear,
    geometrySource: 'sgis-real',
  })

  return {
    ...createBoundaryLoadResult(collection, {
      adminLevel,
      sourceType: 'real',
      sourceDate: APP_CONFIG.sgisBoundaryYear,
      geometrySource: 'sgis-real',
    }),
    statusCode: response.status,
    requestUrl: url.toString(),
    requestedAt,
    requestSent: true,
    responseReceived: true,
    parseSuccess: true,
    responsePreview: toResponsePreview({
      featureCount: collection.features.length,
      geometryType: collection.metadata?.geometryType,
      geometrySource: collection.metadata?.geometrySource,
    }),
    selectedSourceReason: 'SGIS boundary collection was fetched and normalized successfully.',
  }
}

const fetchRawBoundaryCollection = async (
  params: Record<string, string | undefined>,
): Promise<RawBoundaryCollection | null> => {
  const token = await fetchSgisAccessToken()

  if (!token) {
    return null
  }

  const url = new URL(getSgisBoundaryPath(), getSgisBaseUrl())
  url.searchParams.set('accessToken', token)
  url.searchParams.set('year', APP_CONFIG.sgisBoundaryYear)

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url)

  if (!response.ok) {
    return null
  }

  const payload = await parseApiResponsePayload(response)
  const candidatePayload = payload as
    | RawBoundaryCollection
    | { result?: RawBoundaryCollection }
    | { features?: RawBoundaryCollection['features'] }

  if (candidatePayload && typeof candidatePayload === 'object' && 'type' in candidatePayload) {
    return candidatePayload
  }

  if (
    candidatePayload &&
    typeof candidatePayload === 'object' &&
    'result' in candidatePayload &&
    candidatePayload.result
  ) {
    return candidatePayload.result
  }

  if (
    candidatePayload &&
    typeof candidatePayload === 'object' &&
    'features' in candidatePayload &&
    candidatePayload.features
  ) {
    return {
      type: 'FeatureCollection',
      features: candidatePayload.features,
    } satisfies RawBoundaryCollection
  }

  return null
}

const getSgisProvinceCodeMap = async () => {
  if (!sgisProvinceCodeMapPromise) {
    sgisProvinceCodeMapPromise = fetchRawBoundaryCollection({}).then((rawCollection) => {
      const map = new Map<ProvinceCode, string>()

      rawCollection?.features.forEach((feature) => {
        const rawName = String(feature.properties?.adm_nm ?? '').trim()
        const rawCode = String(feature.properties?.adm_cd ?? '').trim()
        const province = provinceByName.get(rawName)

        if (province && rawCode) {
          map.set(province.code, rawCode)
        }
      })

      return map
    })
  }

  return sgisProvinceCodeMapPromise
}

const getSgisCityCodeMap = async (provinceCode: ProvinceCode) => {
  if (!sgisCityCodeMapByProvince.has(provinceCode)) {
    sgisCityCodeMapByProvince.set(
      provinceCode,
      (async () => {
        const provinceCodeMap = await getSgisProvinceCodeMap()
        const sgisProvinceCode = provinceCodeMap.get(provinceCode)
        const map = new Map<CityCode, string>()

        if (!sgisProvinceCode) {
          return map
        }

        const rawCollection = await fetchRawBoundaryCollection({
          adm_cd: sgisProvinceCode,
          low_search: '1',
        })

        if (!rawCollection) {
          return map
        }

        rawCollection.features.forEach((feature) => {
          const rawName = String(feature.properties?.adm_nm ?? '').trim()
          const city = cityByFullName.get(rawName)
          const rawCode = String(feature.properties?.adm_cd ?? '').trim()

          if (city && rawCode) {
            map.set(city.code, rawCode)
          }
        })

        return map
      })(),
    )
  }

  return sgisCityCodeMapByProvince.get(provinceCode)
}

export const fetchProvinceBoundariesFromApi = () =>
  fetchBoundaryCollectionFromApi('province', {
  })

export const fetchCityBoundariesFromApi = async (provinceCode: ProvinceCode) => {
  const provinceCodeMap = await getSgisProvinceCodeMap()
  const sgisProvinceCode = provinceCodeMap.get(provinceCode)

  if (!sgisProvinceCode) {
    return {
      ...createEmptyBoundaryLoadResult('city'),
      requestedAt: new Date().toISOString(),
      fallbackReason: 'Could not resolve SGIS province code from official province code.',
      fallbackReasonCode: 'missing_profile',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      selectedSourceReason: 'official provinceCode could not be translated to SGIS province code.',
    }
  }

  return fetchBoundaryCollectionFromApi('city', {
    adm_cd: sgisProvinceCode,
    low_search: '1',
  })
}

export const fetchTownBoundariesFromApi = async (cityCode: CityCode) => {
  const city = cityCatalog.find((item) => item.code === cityCode)
  const provinceCode = city?.provinceCode as ProvinceCode | undefined
  const cityCodeMap = provinceCode ? await getSgisCityCodeMap(provinceCode) : null
  const sgisCityCode = cityCodeMap?.get(cityCode)

  if (!sgisCityCode) {
    return {
      ...createEmptyBoundaryLoadResult('town'),
      requestedAt: new Date().toISOString(),
      fallbackReason: 'Could not resolve SGIS city code from official city code.',
      fallbackReasonCode: 'missing_profile',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      selectedSourceReason: 'official cityCode could not be translated to SGIS city code.',
    }
  }

  return fetchBoundaryCollectionFromApi('town', {
    adm_cd: sgisCityCode,
    low_search: '1',
  })
}
