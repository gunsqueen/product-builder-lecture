import geoBoundaryUrl from '../../data/geo/HangJeongDong_ver20260201.geojson?url'
import { getAllProvinces } from '../../utils/adminLookup'
import {
  aggregateCityBoundaries,
  aggregateProvinceBoundaries,
  normalizeTownBoundaryCollection,
} from '../../utils/boundaryNormalizer'
import type { BoundaryCollection } from '../../types/admin'

let townBoundaryCache: Promise<BoundaryCollection> | null = null

const loadTownBoundaryCache = async () => {
  const response = await fetch(geoBoundaryUrl)
  if (!response.ok) {
    throw new Error(`Local boundary file load failed: ${response.status}`)
  }

  const raw = await response.json()
  const normalized = normalizeTownBoundaryCollection(raw)

  if (import.meta.env.DEV) {
    const provinceCount = new Set(normalized.features.map((feature) => feature.properties.provinceCode)).size
    const cityCount = new Set(normalized.features.map((feature) => feature.properties.cityCode)).size
    const townCount = normalized.features.length
    console.log('[boundary:local-geojson]', {
      requestUrl: geoBoundaryUrl,
      featureTotalCount: townCount,
      provinceFeatureCount: provinceCount,
      cityFeatureCount: cityCount,
      townFeatureCount: townCount,
      firstFeatureSample: normalized.features[0]?.properties ?? null,
    })
  }

  return normalized
}

const getTownBoundaryCache = () => {
  if (!townBoundaryCache) {
    townBoundaryCache = loadTownBoundaryCache()
  }
  return townBoundaryCache
}

export const fetchProvinceBoundariesFromLocal = async (): Promise<{ collection: BoundaryCollection; requestUrl: string }> => {
  const towns = await getTownBoundaryCache()
  const collection = aggregateProvinceBoundaries(towns.features)
  if (import.meta.env.DEV) {
    const provinceCodes = collection.features.map((feature) => feature.properties.adminCode).sort()
    const missingProvinceCodes = getAllProvinces()
      .map((province) => province.adminCode)
      .filter((code) => !provinceCodes.includes(code))
    console.log('[boundary:local:province]', {
      requestUrl: geoBoundaryUrl,
      featureCount: collection.features.length,
      provinceCodeList: provinceCodes,
      missingProvinceCodes,
      sourceFeatureCounts: Object.fromEntries(
        provinceCodes.map((code) => [
          code,
          towns.features.filter((feature) => feature.properties.provinceCode === code).length,
        ]),
      ),
      geometryTypeSummary: collection.features.map((feature) => ({
        adminCode: feature.properties.adminCode,
        geometryType: feature.geometry.type,
      })),
      firstFeatureSample: collection.features[0]?.properties ?? null,
    })
  }
  return {
    collection,
    requestUrl: geoBoundaryUrl,
  }
}

export const fetchCityBoundariesFromLocal = async (
  provinceCode: string,
): Promise<{ collection: BoundaryCollection; requestUrl: string }> => {
  const towns = await getTownBoundaryCache()
  const collection = aggregateCityBoundaries(towns.features, provinceCode)
  if (import.meta.env.DEV) {
    console.log('[boundary:local:city]', {
      requestUrl: geoBoundaryUrl,
      provinceCode,
      featureCount: collection.features.length,
      firstFeatureSample: collection.features[0]?.properties ?? null,
    })
  }
  return {
    collection,
    requestUrl: geoBoundaryUrl,
  }
}

export const fetchTownBoundariesFromLocal = async (
  cityCode: string,
): Promise<{ collection: BoundaryCollection; requestUrl: string }> => {
  const towns = await getTownBoundaryCache()
  const collection = {
      type: 'FeatureCollection',
      features: towns.features.filter((feature) => feature.properties.parentCode === cityCode),
    } satisfies BoundaryCollection
  if (import.meta.env.DEV) {
    console.log('[boundary:local:town]', {
      requestUrl: geoBoundaryUrl,
      cityCode,
      featureCount: collection.features.length,
      firstFeatureSample: collection.features[0]?.properties ?? null,
    })
  }
  return {
    collection,
    requestUrl: geoBoundaryUrl,
  }
}
