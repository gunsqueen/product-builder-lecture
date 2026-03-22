import type { BoundaryCollection } from '../types/admin'
import {
  fetchCityBoundariesFromLocal,
  fetchProvinceBoundariesFromLocal,
  fetchTownBoundariesFromLocal,
} from './api/localBoundaryApi'
import { updateDataSourceStatus } from './dataSourceStatusService'
import { setBoundaryStatus } from './sourceStatusService'

export const loadProvinceBoundaries = async (): Promise<BoundaryCollection> => {
  const result = await fetchProvinceBoundariesFromLocal()
  if (import.meta.env.DEV) {
    console.log('[boundary:service]', {
      level: 'province',
      featureCount: result.collection.features.length,
      firstFeatureSample: result.collection.features[0]?.properties ?? null,
    })
  }
  setBoundaryStatus({
    sourceType: 'snapshot',
    requestUrl: result.requestUrl,
    scope: 'province',
  })
  updateDataSourceStatus({
    sourceKey: 'boundary',
    currentSourceType: 'snapshot',
    requestedMode: 'snapshot',
    requestSent: true,
    responseReceived: true,
    parseSuccess: true,
    normalizerSuccess: result.collection.features.length > 0,
    normalizedItemCount: result.collection.features.length,
    fallbackReason: 'none',
    selectedSourceReason: '로컬 GeoJSON 행정경계 사용',
    requestUrl: result.requestUrl,
    statusCode: 200,
  })
  return result.collection
}

export const loadCityBoundaries = async (provinceCode: string): Promise<BoundaryCollection> => {
  const result = await fetchCityBoundariesFromLocal(provinceCode)
  if (import.meta.env.DEV) {
    console.log('[boundary:service]', {
      level: 'city',
      provinceCode,
      featureCount: result.collection.features.length,
      firstFeatureSample: result.collection.features[0]?.properties ?? null,
    })
  }
  setBoundaryStatus({
    sourceType: 'snapshot',
    requestUrl: result.requestUrl,
    scope: 'city',
  })
  updateDataSourceStatus({
    sourceKey: 'boundary',
    currentSourceType: 'snapshot',
    requestedMode: 'snapshot',
    requestSent: true,
    responseReceived: true,
    parseSuccess: true,
    normalizerSuccess: result.collection.features.length > 0,
    normalizedItemCount: result.collection.features.length,
    fallbackReason: 'none',
    selectedSourceReason: '로컬 GeoJSON 행정경계 사용',
    requestUrl: result.requestUrl,
    statusCode: 200,
  })
  return result.collection
}

export const loadTownBoundaries = async (cityCode: string): Promise<BoundaryCollection> => {
  const result = await fetchTownBoundariesFromLocal(cityCode)
  if (import.meta.env.DEV) {
    console.log('[boundary:service]', {
      level: 'town',
      cityCode,
      featureCount: result.collection.features.length,
      firstFeatureSample: result.collection.features[0]?.properties ?? null,
    })
  }
  setBoundaryStatus({
    sourceType: 'snapshot',
    requestUrl: result.requestUrl,
    scope: 'town',
  })
  updateDataSourceStatus({
    sourceKey: 'boundary',
    currentSourceType: 'snapshot',
    requestedMode: 'snapshot',
    requestSent: true,
    responseReceived: true,
    parseSuccess: true,
    normalizerSuccess: result.collection.features.length > 0,
    normalizedItemCount: result.collection.features.length,
    fallbackReason: result.collection.features.length > 0 ? 'none' : 'empty_result',
    selectedSourceReason: result.collection.features.length > 0 ? '로컬 GeoJSON 행정경계 사용' : '로컬 GeoJSON에 해당 경계가 없음',
    requestUrl: result.requestUrl,
    statusCode: 200,
  })
  return result.collection
}
