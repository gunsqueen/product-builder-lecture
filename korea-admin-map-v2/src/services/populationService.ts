import { updateDataSourceStatus } from './dataSourceStatusService'
import { fetchTownPopulation } from './api/populationApi'
import type { BoundaryFeature } from '../types/admin'
import type { PopulationStats } from '../types/population'

export const loadTownPopulation = async (cityCode: string, boundaries: BoundaryFeature[]) => {
  const result = await fetchTownPopulation(cityCode, boundaries)

  updateDataSourceStatus({
    sourceKey: 'population',
    currentSourceType: result.sourceType,
    requestedMode: 'real',
    requestSent: result.requestSent,
    responseReceived: result.responseReceived,
    parseSuccess: result.parseSuccess,
    normalizerSuccess: result.records.length > 0,
    normalizedItemCount: result.records.length,
    fallbackReason: result.fallbackReason as never,
    selectedSourceReason:
      result.selectedSourceReason ??
      (result.sourceType === 'real'
        ? '행정안전부 인구 API 응답 사용'
        : result.sourceType === 'snapshot'
          ? 'MOIS real 응답이 없어서 snapshot 인구 데이터를 사용'
          : 'mock 인구 데이터를 사용'),
    requestUrl: result.requestUrl,
    statusCode: result.statusCode,
    lastRequestTimestamp: result.requestedAt,
  })

  return result
}

export const findPopulationRecord = (records: PopulationStats[], townCode: string) =>
  records.find((record) => record.adminCode === townCode)
