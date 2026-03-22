import { fetchCityBoundaries, fetchProvinceBoundaries, fetchTownBoundaries } from './api/sgisApi'
import { updateDataSourceStatus } from './dataSourceStatusService'
import type { BoundaryFeatureCollection } from '../types/admin'

const updateBoundaryStatus = (result: Awaited<ReturnType<typeof fetchProvinceBoundaries>>) => {
  updateDataSourceStatus({
    sourceKey: 'boundary',
    currentSourceType: result.sourceType,
    requestedMode: 'real',
    requestSent: result.requestSent,
    responseReceived: result.responseReceived,
    parseSuccess: result.parseSuccess,
    normalizerSuccess: Boolean(result.collection?.features.length),
    normalizedItemCount: result.collection?.features.length ?? 0,
    fallbackReason: result.fallbackReason as never,
    selectedSourceReason:
      result.sourceType === 'real' ? '실제 SGIS 경계 사용' : 'snapshot 경계 fallback 사용',
    requestUrl: result.requestUrl,
    statusCode: result.statusCode,
    lastRequestTimestamp: result.requestedAt,
  })
}

export const loadProvinceBoundaries = async (): Promise<BoundaryFeatureCollection | null> => {
  const result = await fetchProvinceBoundaries()
  updateBoundaryStatus(result)
  return result.collection
}

export const loadCityBoundaries = async (provinceCode: string): Promise<BoundaryFeatureCollection | null> => {
  const result = await fetchCityBoundaries(provinceCode)
  updateBoundaryStatus(result)
  return result.collection
}

export const loadTownBoundaries = async (cityCode: string): Promise<BoundaryFeatureCollection | null> => {
  const result = await fetchTownBoundaries(cityCode)
  updateBoundaryStatus(result)
  return result.collection
}
