import snapshotElectionData from '@/data/snapshot/elections.sample.json'
import { getSourcePriority } from '@/config/dataSourcePolicy'
import { listElectionApiProfiles } from '@/config/electionApiProfiles'
import { getMockElectionResults } from '@/data/mock'
import { APP_CONFIG } from '@/config/app'
import {
  fetchElectionResultsFromApi,
  hasElectionApiConfig,
} from '@/services/api/electionApi'
import type { AdminCode, AdminLevel, CityCode, ProvinceCode, TownCode } from '@/types/admin'
import type {
  ElectionDefinition,
  ElectionResult,
  ElectionSourceType,
  RawElectionInput,
} from '@/types/election'
import { logDataSourceEvent } from '@/utils/dataSourceLogger'
import {
  getTopElectionResult,
  listAvailableElectionDefinitions,
  normalizeElectionCollection,
} from '@/utils/electionNormalizer'

const snapshotElectionResults = normalizeElectionCollection(
  snapshotElectionData as RawElectionInput[],
  'snapshot',
)

const filterElectionResults = (
  records: ElectionResult[],
  level?: AdminLevel,
  adminCode?: AdminCode,
  electionId?: string,
) =>
  records.filter((record) => {
    if (level && record.adminLevel !== level) {
      return false
    }

    if (adminCode && record.adminCode !== adminCode) {
      return false
    }

    if (electionId && record.electionId !== electionId) {
      return false
    }

    return true
  })

const mergeElectionCollections = (
  primaryRecords: ElectionResult[],
  fallbackRecords: ElectionResult[],
) => {
  const merged = new Map<string, ElectionResult>()

  fallbackRecords.forEach((record) => {
    merged.set(`${record.electionId}:${record.adminCode}:${record.candidateName}`, record)
  })

  primaryRecords.forEach((record) => {
    merged.set(`${record.electionId}:${record.adminCode}:${record.candidateName}`, record)
  })

  return [...merged.values()]
}

const getSnapshotElectionResults = (electionId?: string, adminCode?: AdminCode) =>
  filterElectionResults(snapshotElectionResults, undefined, adminCode, electionId)

export const getAvailableElections = async (): Promise<ElectionDefinition[]> => {
  const baseResults =
    APP_CONFIG.dataSourceMode === 'mock'
      ? getMockElectionResults()
      : mergeElectionCollections(snapshotElectionResults, getMockElectionResults())
  const localDefinitions = listAvailableElectionDefinitions(baseResults)
  const localDefinitionIds = new Set(localDefinitions.map((definition) => definition.electionId))
  const apiDefinitions = listElectionApiProfiles()
    .filter((profile) => !localDefinitionIds.has(profile.electionId))
    .map((profile) => {
      const sourceType: ElectionSourceType =
        APP_CONFIG.dataSourceMode === 'real' ? 'real' : 'snapshot'

      return {
        electionId: profile.electionId,
        electionName: profile.electionName,
        electionType: profile.electionType,
        electionDate: profile.electionDate,
        sourceType,
      }
    })

  return [...localDefinitions, ...apiDefinitions].sort((left, right) =>
    right.electionDate.localeCompare(left.electionDate),
  )
}

export const getElectionResultsByAdminCode = async (
  adminCode: AdminCode,
  electionId: string,
) => {
  if (APP_CONFIG.dataSourceMode === 'real') {
    if (!hasElectionApiConfig()) {
      const fallbackResults = mergeElectionCollections(
        getSnapshotElectionResults(electionId, adminCode),
        filterElectionResults(getMockElectionResults(), undefined, adminCode, electionId),
      )
      logDataSourceEvent({
        domain: 'election',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: fallbackResults[0]?.sourceType ?? 'snapshot',
        status: 'fallback',
        detail: 'NEC API key is missing. Using snapshot/mock fallback.',
        selectedSourceReason: 'API 키가 없어 election real request를 보내지 못했습니다.',
        adminCode,
        count: fallbackResults.length,
        fallbackReason: 'NEC API key is missing.',
        fallbackReasonCode: 'missing_api_key',
        requestSent: false,
        responseReceived: false,
        parseSuccess: false,
      })
      return fallbackResults
    }

    try {
      const apiResult = await fetchElectionResultsFromApi(electionId, adminCode)
      const apiResults = apiResult.records
      if (apiResults && apiResults.length > 0) {
        logDataSourceEvent({
          domain: 'election',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: 'real',
          status: 'selected',
          detail: `Using NEC API results for election ${electionId}.`,
          selectedSourceReason: 'real election rows were selected from NEC API.',
          adminCode,
          count: apiResults.length,
          statusCode: apiResult.statusCode,
          requestUrl: apiResult.requestUrl,
          requestedAt: apiResult.requestedAt,
          fallbackReasonCode: apiResult.fallbackReasonCode,
          requestSent: apiResult.requestSent,
          responseReceived: apiResult.responseReceived,
          parseSuccess: apiResult.parseSuccess,
          responsePreview: apiResult.responsePreview,
        })
        return apiResults
      }

      if (apiResult.fallbackReason) {
        logDataSourceEvent({
          domain: 'election',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: 'snapshot',
          status: 'fallback',
          detail: apiResult.fallbackReason,
          selectedSourceReason:
            apiResult.selectedSourceReason ?? 'real election response was unusable, so snapshot fallback was selected.',
          adminCode,
          count: 0,
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
        return mergeElectionCollections(
          getSnapshotElectionResults(electionId, adminCode),
          filterElectionResults(getMockElectionResults(), undefined, adminCode, electionId),
        )
      }
    } catch (error) {
      logDataSourceEvent({
        domain: 'election',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: 'snapshot',
        status: 'error',
        detail: error instanceof Error ? error.message : 'Unknown NEC API error',
        selectedSourceReason:
          'real election request threw an exception, so snapshot fallback was selected.',
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
      return mergeElectionCollections(
        getSnapshotElectionResults(electionId, adminCode),
        filterElectionResults(getMockElectionResults(), undefined, adminCode, electionId),
      )
    }
  }

  if (APP_CONFIG.dataSourceMode === 'mock') {
    const mockResults = filterElectionResults(
      getMockElectionResults(),
      undefined,
      adminCode,
      electionId,
    )
    logDataSourceEvent({
      domain: 'election',
      requestedMode: APP_CONFIG.dataSourceMode,
      sourceType: 'mock',
      status: 'selected',
      detail: `Using mock election results for ${electionId}.`,
      adminCode,
      count: mockResults.length,
    })
    return mockResults
  }

  const fallbackResults = mergeElectionCollections(
    getSnapshotElectionResults(electionId, adminCode),
    filterElectionResults(getMockElectionResults(), undefined, adminCode, electionId),
  )
  logDataSourceEvent({
    domain: 'election',
    requestedMode: APP_CONFIG.dataSourceMode,
    sourceType: 'snapshot',
    status: 'selected',
    detail: `Using snapshot election results for ${electionId}.`,
    adminCode,
    count: fallbackResults.length,
  })
  return fallbackResults
}

export const getProvinceElectionResults = (
  provinceCode: ProvinceCode,
  electionId: string,
) => getElectionResultsByAdminCode(provinceCode, electionId)

export const getCityElectionResults = (cityCode: CityCode, electionId: string) =>
  getElectionResultsByAdminCode(cityCode, electionId)

export const getTownElectionResults = (townCode: TownCode, electionId: string) =>
  getElectionResultsByAdminCode(townCode, electionId)

export const getElectionResults = async (
  level: AdminLevel,
  electionId?: string,
): Promise<ElectionResult[]> => {
  if (APP_CONFIG.dataSourceMode === 'real' && electionId) {
    if (!hasElectionApiConfig()) {
      const fallbackRecords = mergeElectionCollections(
        filterElectionResults(snapshotElectionResults, level, undefined, electionId),
        filterElectionResults(getMockElectionResults(), level, undefined, electionId),
      )
      logDataSourceEvent({
        domain: 'election',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: fallbackRecords[0]?.sourceType ?? 'snapshot',
        status: 'fallback',
        detail: `NEC API key is missing. Using fallback for ${electionId}.`,
        selectedSourceReason: 'API 키가 없어 aggregate election real request를 보내지 못했습니다.',
        count: fallbackRecords.length,
        fallbackReason: 'NEC API key is missing.',
        fallbackReasonCode: 'missing_api_key',
        requestSent: false,
        responseReceived: false,
        parseSuccess: false,
      })
      return fallbackRecords
    }

    try {
      const apiResult = await fetchElectionResultsFromApi(electionId)
      const apiRecords = apiResult.records
      if (apiRecords && apiRecords.length > 0) {
        const mergedRecords = mergeElectionCollections(
          filterElectionResults(apiRecords, level, undefined, electionId),
          mergeElectionCollections(
            filterElectionResults(snapshotElectionResults, level, undefined, electionId),
            filterElectionResults(getMockElectionResults(), level, undefined, electionId),
          ),
        )
        logDataSourceEvent({
          domain: 'election',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: 'real',
          status: 'selected',
          detail: `Using NEC API results merged with fallback for ${electionId}.`,
          selectedSourceReason:
            'real election rows were selected and merged with snapshot/mock fallback.',
          count: mergedRecords.length,
          statusCode: apiResult.statusCode,
          requestUrl: apiResult.requestUrl,
          requestedAt: apiResult.requestedAt,
          fallbackReasonCode: apiResult.fallbackReasonCode,
          requestSent: apiResult.requestSent,
          responseReceived: apiResult.responseReceived,
          parseSuccess: apiResult.parseSuccess,
          responsePreview: apiResult.responsePreview,
        })
        return mergedRecords
      }

      if (apiResult.fallbackReason) {
        logDataSourceEvent({
          domain: 'election',
          requestedMode: APP_CONFIG.dataSourceMode,
          sourceType: 'snapshot',
          status: 'fallback',
          detail: apiResult.fallbackReason,
          selectedSourceReason:
            apiResult.selectedSourceReason ?? 'real aggregate election response was unusable.',
          count: 0,
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
        return mergeElectionCollections(
          filterElectionResults(snapshotElectionResults, level, undefined, electionId),
          filterElectionResults(getMockElectionResults(), level, undefined, electionId),
        )
      }
    } catch (error) {
      logDataSourceEvent({
        domain: 'election',
        requestedMode: APP_CONFIG.dataSourceMode,
        sourceType: 'snapshot',
        status: 'error',
        detail: error instanceof Error ? error.message : 'Unknown NEC API error',
        selectedSourceReason:
          'real aggregate election request threw an exception, so snapshot fallback was selected.',
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
      return mergeElectionCollections(
        filterElectionResults(snapshotElectionResults, level, undefined, electionId),
        filterElectionResults(getMockElectionResults(), level, undefined, electionId),
      )
    }
  }

  if (APP_CONFIG.dataSourceMode === 'mock') {
    const mockRecords = filterElectionResults(
      getMockElectionResults(),
      level,
      undefined,
      electionId,
    )
    logDataSourceEvent({
      domain: 'election',
      requestedMode: APP_CONFIG.dataSourceMode,
      sourceType: 'mock',
      status: 'selected',
      detail: electionId
        ? `Using mock election results for ${electionId}.`
        : 'Using mock election results.',
      count: mockRecords.length,
    })
    return mockRecords
  }

  const fallbackRecords = mergeElectionCollections(
    filterElectionResults(snapshotElectionResults, level, undefined, electionId),
    filterElectionResults(getMockElectionResults(), level, undefined, electionId),
  )
  logDataSourceEvent({
    domain: 'election',
    requestedMode: APP_CONFIG.dataSourceMode,
    sourceType: 'snapshot',
    status: 'selected',
      detail: electionId
        ? `Using snapshot election results for ${electionId}. Policy: ${getSourcePriority('election', APP_CONFIG.dataSourceMode).join(' -> ')}`
        : `Using snapshot election results. Policy: ${getSourcePriority('election', APP_CONFIG.dataSourceMode).join(' -> ')}`,
      selectedSourceReason:
        'real 모드가 아니거나 real election 결과가 선택되지 않아 snapshot dataset을 사용합니다.',
      count: fallbackRecords.length,
    })
  return fallbackRecords
}

export const getElectionSummaryByAdminCode = async (
  adminCode: AdminCode,
  electionId: string,
) => {
  const results = await getElectionResultsByAdminCode(adminCode, electionId)
  return getTopElectionResult(results)
}

export const getDefaultElectionForLevel = async (
  level: AdminLevel,
): Promise<string | null> => {
  const definitions = await getAvailableElections()
  for (const definition of definitions) {
    const results = await getElectionResults(level, definition.electionId)
    if (results.length > 0) {
      return definition.electionId
    }
  }

  return null
}
