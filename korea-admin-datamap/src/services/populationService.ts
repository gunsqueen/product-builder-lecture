import snapshotPopulationData from '@/data/snapshot/population.sample.json'
import { getSourcePriority } from '@/config/dataSourcePolicy'
import { getMockPopulationByCode, getMockPopulationStats } from '@/data/mock'
import { APP_CONFIG } from '@/config/app'
import {
  getCityCatalog,
  getTownCatalog,
} from '@/services/adminService'
import {
  fetchPopulationFromApi,
  hasPopulationApiConfig,
} from '@/services/api/populationApi'
import type { AdminCode, AdminLevel, CityCode, ProvinceCode, TownCode } from '@/types/admin'
import type { PopulationStats, RawPopulationInput } from '@/types/population'
import { logDataSourceEvent } from '@/utils/dataSourceLogger'
import { normalizePopulationCollection } from '@/utils/populationNormalizer'

const snapshotPopulationStats = normalizePopulationCollection(
  snapshotPopulationData as RawPopulationInput[],
  'snapshot',
)

const filterPopulationStats = (
  records: PopulationStats[],
  level: AdminLevel,
  parentCode?: AdminCode,
) =>
  records.filter((record) => {
    if (record.adminLevel !== level) {
      return false
    }

    if (!parentCode) {
      return true
    }

    if (level === 'province') {
      return record.adminCode === parentCode
    }

    return String(record.adminCode).startsWith(parentCode)
  })

const getSnapshotPopulationStats = (
  level: AdminLevel,
  parentCode?: AdminCode,
) => filterPopulationStats(snapshotPopulationStats, level, parentCode)

const getSnapshotPopulationByCode = (adminCode: AdminCode) =>
  snapshotPopulationStats.find((record) => record.adminCode === adminCode) ?? null

const mergePopulationCollections = (
  primaryRecords: PopulationStats[],
  fallbackRecords: PopulationStats[],
) => {
  const merged = new Map<AdminCode, PopulationStats>()

  fallbackRecords.forEach((record) => {
    merged.set(record.adminCode, record)
  })

  primaryRecords.forEach((record) => {
    merged.set(record.adminCode, record)
  })

  return [...merged.values()]
}

const mergePopulationRecord = (
  primaryRecord: PopulationStats,
  fallbackRecord?: PopulationStats,
): PopulationStats => {
  if (!fallbackRecord) {
    return primaryRecord
  }

  const resolveMetric = (primaryValue: number, fallbackValue: number) =>
    primaryValue > 0 ? primaryValue : fallbackValue
  const scaleFallbackAgeMetric = (fallbackValue: number) => {
    if (
      fallbackRecord.totalPopulation <= 0 ||
      primaryRecord.totalPopulation <= 0 ||
      fallbackValue <= 0
    ) {
      return fallbackValue
    }

    return Math.round(
      primaryRecord.totalPopulation * (fallbackValue / fallbackRecord.totalPopulation),
    )
  }
  const resolveAgeMetric = (primaryValue: number, fallbackValue: number) =>
    primaryValue > 0 ? primaryValue : scaleFallbackAgeMetric(fallbackValue)

  return {
    ...fallbackRecord,
    ...primaryRecord,
    totalPopulation: resolveMetric(
      primaryRecord.totalPopulation,
      fallbackRecord.totalPopulation,
    ),
    householdCount: resolveMetric(
      primaryRecord.householdCount,
      fallbackRecord.householdCount,
    ),
    malePopulation: resolveMetric(
      primaryRecord.malePopulation,
      fallbackRecord.malePopulation,
    ),
    femalePopulation: resolveMetric(
      primaryRecord.femalePopulation,
      fallbackRecord.femalePopulation,
    ),
    age0to9: resolveAgeMetric(primaryRecord.age0to9, fallbackRecord.age0to9),
    age10to19: resolveAgeMetric(primaryRecord.age10to19, fallbackRecord.age10to19),
    age20to29: resolveAgeMetric(primaryRecord.age20to29, fallbackRecord.age20to29),
    age30to39: resolveAgeMetric(primaryRecord.age30to39, fallbackRecord.age30to39),
    age40to49: resolveAgeMetric(primaryRecord.age40to49, fallbackRecord.age40to49),
    age50to59: resolveAgeMetric(primaryRecord.age50to59, fallbackRecord.age50to59),
    age60to64: resolveAgeMetric(primaryRecord.age60to64, fallbackRecord.age60to64),
    age65plus: resolveAgeMetric(primaryRecord.age65plus, fallbackRecord.age65plus),
    sourceType: primaryRecord.sourceType,
    sourceDate:
      primaryRecord.sourceDate !== '1970-01-01'
        ? primaryRecord.sourceDate
        : fallbackRecord.sourceDate,
  }
}

const mergePopulationWithFallback = (
  primaryRecords: PopulationStats[],
  fallbackRecords: PopulationStats[],
) => {
  const fallbackMap = new Map(
    fallbackRecords.map((record) => [record.adminCode, record]),
  )
  const merged = new Map<AdminCode, PopulationStats>()

  fallbackRecords.forEach((record) => {
    merged.set(record.adminCode, record)
  })

  primaryRecords.forEach((record) => {
    merged.set(record.adminCode, mergePopulationRecord(record, fallbackMap.get(record.adminCode)))
  })

  return [...merged.values()]
}

const getAllowedPopulationCodes = (
  level: AdminLevel,
  parentCode?: AdminCode,
) => {
  if (level === 'province') {
    return parentCode ? new Set([parentCode]) : null
  }

  if (level === 'city') {
    if (!parentCode) {
      return null
    }

    return new Set(
      getCityCatalog()
        .filter((city) => city.provinceCode === parentCode)
        .map((city) => city.code),
    )
  }

  if (!parentCode) {
    return null
  }

  return new Set(
    getTownCatalog()
      .filter((town) => town.cityCode === parentCode)
      .map((town) => town.code),
  )
}

const scopePopulationRecords = (
  records: PopulationStats[],
  level: AdminLevel,
  parentCode?: AdminCode,
) => {
  const allowedCodes = getAllowedPopulationCodes(level, parentCode)

  return filterPopulationStats(records, level, parentCode).filter(
    (record) => !allowedCodes || allowedCodes.has(record.adminCode),
  )
}

export const getPopulationStats = async (
  level: AdminLevel,
  parentCode?: AdminCode,
): Promise<PopulationStats[]> => {
  const snapshotRecords = getSnapshotPopulationStats(level, parentCode)
  const mockRecords = getMockPopulationStats(level, parentCode)
  const fallbackRecords = mergePopulationCollections(snapshotRecords, mockRecords)

  if (APP_CONFIG.dataSourceMode === 'real') {
    if (!hasPopulationApiConfig()) {
      logDataSourceEvent({
        domain: 'population',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: 'snapshot',
        status: 'fallback',
        detail: 'Population source policy: real -> snapshot -> mock. Using fallback because real API is unavailable.',
        selectedSourceReason: 'real API 설정이 없어 snapshot/mock fallback이 선택되었습니다.',
        adminCode: parentCode,
        count: fallbackRecords.length,
        fallbackReason: 'MOIS API key is missing.',
        fallbackReasonCode: 'missing_api_key',
        requestSent: false,
        responseReceived: false,
        parseSuccess: false,
      })
      return fallbackRecords
    }

    try {
      const apiResult = await fetchPopulationFromApi(parentCode, level)
      const apiRecords = apiResult.records

      if (apiRecords && apiRecords.length > 0) {
        const merged = mergePopulationWithFallback(
          scopePopulationRecords(apiRecords, level, parentCode),
          fallbackRecords,
        )
        logDataSourceEvent({
          domain: 'population',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: 'real',
          status: 'selected',
          detail: 'Using MOIS API response merged with snapshot/mock fallback.',
          selectedSourceReason:
            'real population records were selected and missing metrics were supplemented from fallback.',
          adminCode: parentCode,
          count: merged.length,
          statusCode: apiResult.statusCode,
          requestUrl: apiResult.requestUrl,
          requestedAt: apiResult.requestedAt,
          fallbackReasonCode: apiResult.fallbackReasonCode,
          requestSent: apiResult.requestSent,
          responseReceived: apiResult.responseReceived,
          parseSuccess: apiResult.parseSuccess,
          responsePreview: apiResult.responsePreview,
        })
        return merged
      }

      if (apiResult.fallbackReason) {
        logDataSourceEvent({
          domain: 'population',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: 'snapshot',
          status: 'fallback',
          detail: apiResult.fallbackReason,
          selectedSourceReason:
            apiResult.selectedSourceReason ?? 'real response was unusable, so snapshot/mock fallback was selected.',
          adminCode: parentCode,
          count: fallbackRecords.length,
          statusCode: apiResult.statusCode,
          requestUrl: apiResult.requestUrl,
          requestedAt: apiResult.requestedAt,
          fallbackReason: apiResult.fallbackReason,
          fallbackReasonCode: apiResult.fallbackReasonCode,
          requestSent: apiResult.requestSent,
          responseReceived: apiResult.responseReceived,
          parseSuccess: apiResult.parseSuccess,
          responsePreview: apiResult.responsePreview,
        })
        return fallbackRecords
      }
    } catch (error) {
      logDataSourceEvent({
        domain: 'population',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: 'snapshot',
        status: 'error',
        detail: error instanceof Error ? error.message : 'Unknown MOIS API error',
        selectedSourceReason: 'real request threw an exception, so snapshot/mock fallback was selected.',
        adminCode: parentCode,
        count: fallbackRecords.length,
        statusCode:
          typeof error === 'object' && error && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined,
        requestUrl:
          typeof error === 'object' && error && 'requestUrl' in error
            ? String((error as { requestUrl?: string }).requestUrl)
            : undefined,
        requestedAt:
          typeof error === 'object' && error && 'requestedAt' in error
            ? String((error as { requestedAt?: string }).requestedAt)
            : undefined,
        fallbackReasonCode: 'unknown_error',
        requestSent:
          typeof error === 'object' && error && 'requestSent' in error
            ? Boolean((error as { requestSent?: boolean }).requestSent)
            : true,
        responseReceived:
          typeof error === 'object' && error && 'responseReceived' in error
            ? Boolean((error as { responseReceived?: boolean }).responseReceived)
            : undefined,
        parseSuccess:
          typeof error === 'object' && error && 'parseSuccess' in error
            ? Boolean((error as { parseSuccess?: boolean }).parseSuccess)
            : undefined,
        responsePreview:
          typeof error === 'object' && error && 'responsePreview' in error
            ? String((error as { responsePreview?: string }).responsePreview)
            : undefined,
      })
      return fallbackRecords
    }
  }

  logDataSourceEvent({
    domain: 'population',
    requestedMode: APP_CONFIG.dataSourceMode,
    sourceType: APP_CONFIG.dataSourceMode === 'mock' ? 'mock' : 'snapshot',
    status: 'selected',
    detail:
      APP_CONFIG.dataSourceMode === 'mock'
        ? 'Using mock population dataset.'
        : 'Using snapshot population dataset.',
    selectedSourceReason:
      APP_CONFIG.dataSourceMode === 'mock'
        ? 'mock 모드라 mock dataset이 선택되었습니다.'
        : 'real 모드가 아니거나 real 시도를 하지 않아 snapshot dataset이 선택되었습니다.',
    adminCode: parentCode,
    count: fallbackRecords.length,
  })

  return fallbackRecords
}

export const getPopulationByAdminCode = async (
  adminCode: AdminCode,
): Promise<PopulationStats | null> => {
  const fallbackRecord = getSnapshotPopulationByCode(adminCode) ?? getMockPopulationByCode(adminCode)

  if (APP_CONFIG.dataSourceMode === 'real') {
    if (!hasPopulationApiConfig()) {
      logDataSourceEvent({
        domain: 'population',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: fallbackRecord?.sourceType ?? 'snapshot',
        status: 'fallback',
        detail: 'MOIS API key is missing. Using fallback by adminCode.',
        selectedSourceReason: 'API 키가 없어 adminCode 단건 조회도 fallback으로 내려갔습니다.',
        adminCode,
        count: fallbackRecord ? 1 : 0,
        fallbackReason: 'MOIS API key is missing.',
        fallbackReasonCode: 'missing_api_key',
        requestSent: false,
        responseReceived: false,
        parseSuccess: false,
      })
      return fallbackRecord
    }

    try {
      const apiResult = await fetchPopulationFromApi(adminCode)
      const apiRecords = apiResult.records
      const apiRecord = apiRecords?.find((record) => record.adminCode === adminCode)

      if (apiRecord) {
        const mergedRecord = mergePopulationRecord(apiRecord, fallbackRecord ?? undefined)
        logDataSourceEvent({
          domain: 'population',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: 'real',
          status: 'selected',
          detail: 'Using MOIS API record merged with fallback for missing fields.',
          selectedSourceReason:
            'real population record was found for this adminCode and merged with fallback fields.',
          adminCode,
          count: 1,
          statusCode: apiResult.statusCode,
          requestUrl: apiResult.requestUrl,
          requestedAt: apiResult.requestedAt,
          fallbackReasonCode: apiResult.fallbackReasonCode,
          requestSent: apiResult.requestSent,
          responseReceived: apiResult.responseReceived,
          parseSuccess: apiResult.parseSuccess,
          responsePreview: apiResult.responsePreview,
        })
        return mergedRecord
      }

      if (apiResult.fallbackReason) {
        logDataSourceEvent({
          domain: 'population',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: fallbackRecord?.sourceType ?? 'snapshot',
          status: 'fallback',
          detail: apiResult.fallbackReason,
          selectedSourceReason:
            apiResult.selectedSourceReason ?? 'real adminCode lookup returned no usable record.',
          adminCode,
          count: fallbackRecord ? 1 : 0,
          statusCode: apiResult.statusCode,
          requestUrl: apiResult.requestUrl,
          requestedAt: apiResult.requestedAt,
          fallbackReason: apiResult.fallbackReason,
          fallbackReasonCode: apiResult.fallbackReasonCode,
          requestSent: apiResult.requestSent,
          responseReceived: apiResult.responseReceived,
          parseSuccess: apiResult.parseSuccess,
          responsePreview: apiResult.responsePreview,
        })
        return fallbackRecord
      }
    } catch (error) {
      logDataSourceEvent({
        domain: 'population',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: 'snapshot',
        status: 'error',
        detail: error instanceof Error ? error.message : 'Unknown MOIS API error',
        selectedSourceReason:
          'real adminCode lookup threw an exception, so snapshot/mock fallback was selected.',
        adminCode,
        count: 0,
        statusCode:
          typeof error === 'object' && error && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined,
        requestUrl:
          typeof error === 'object' && error && 'requestUrl' in error
            ? String((error as { requestUrl?: string }).requestUrl)
            : undefined,
        requestedAt:
          typeof error === 'object' && error && 'requestedAt' in error
            ? String((error as { requestedAt?: string }).requestedAt)
            : undefined,
        fallbackReasonCode: 'unknown_error',
        requestSent:
          typeof error === 'object' && error && 'requestSent' in error
            ? Boolean((error as { requestSent?: boolean }).requestSent)
            : true,
        responseReceived:
          typeof error === 'object' && error && 'responseReceived' in error
            ? Boolean((error as { responseReceived?: boolean }).responseReceived)
            : undefined,
        parseSuccess:
          typeof error === 'object' && error && 'parseSuccess' in error
            ? Boolean((error as { parseSuccess?: boolean }).parseSuccess)
            : undefined,
        responsePreview:
          typeof error === 'object' && error && 'responsePreview' in error
            ? String((error as { responsePreview?: string }).responsePreview)
            : undefined,
      })
      return fallbackRecord
    }
  }

  logDataSourceEvent({
    domain: 'population',
    requestedMode: APP_CONFIG.dataSourceMode,
    sourceType: fallbackRecord?.sourceType ?? 'snapshot',
    status: 'selected',
    detail: `Using local population fallback record. Policy: ${getSourcePriority('population', APP_CONFIG.dataSourceMode).join(' -> ')}`,
    selectedSourceReason:
      'real 모드가 아니거나 real 단건 결과가 없어 local fallback record가 선택되었습니다.',
    adminCode,
    count: fallbackRecord ? 1 : 0,
  })

  return fallbackRecord
}

export const getProvincePopulation = (provinceCode: ProvinceCode) =>
  getPopulationByAdminCode(provinceCode)

export const getCityPopulation = (cityCode: CityCode) =>
  getPopulationByAdminCode(cityCode)

export const getTownPopulation = (townCode: TownCode) =>
  getPopulationByAdminCode(townCode)
