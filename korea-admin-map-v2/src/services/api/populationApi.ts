import gangseoPopulationSnapshot from '../../data/snapshot/gangseo-town-population.json'
import gangseoTownHouseholdSizes from '../../data/snapshot/gangseo-town-household-sizes.json'
import { APP_CONFIG, isDev } from '../../config/app'
import { buildNameAliases, normalizeAdminName } from '../../utils/adminName'
import { getCityByCode } from '../../utils/adminLookup'
import { normalizePopulationRecord } from '../../utils/populationNormalizer'
import { calculateAge0to14, calculateAge15to64, calculateSeniorPopulation } from '../../utils/populationMetrics'
import { buildRuntimeUrl } from '../../utils/url'
import type { BoundaryFeature } from '../../types/admin'
import type { DistributionItem, PopulationStats } from '../../types/population'

type PopulationApiResult = {
  records: PopulationStats[]
  sourceType: 'real' | 'snapshot' | 'mock'
  fallbackReason: string
  selectedSourceReason?: string
  requestUrl?: string
  statusCode?: number
  requestedAt: string
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
}

const CSV_OPERATION = 'downloadCsv.do'
const AGE_CSV_OPERATION = 'downloadCsvAge.do'

const getSnapshot = () =>
  (gangseoPopulationSnapshot as Array<Record<string, unknown>>).map((item) =>
    normalizePopulationRecord({
      adminCode: String(item.adminCode),
      totalPopulation: Number(item.totalPopulation),
      householdCount: Number(item.householdCount),
      malePopulation: Number(item.malePopulation),
      femalePopulation: Number(item.femalePopulation),
      age0to14: Number(item.age0to14 ?? 0),
      age15to64: Number(item.age15to64 ?? 0),
      age65plus: Number(item.age65plus ?? 0),
      householdSizeDistribution:
        (gangseoTownHouseholdSizes as Array<{ adminCode: string; distribution: DistributionItem[] }>).find(
          (entry) => entry.adminCode === String(item.adminCode),
        )?.distribution ?? [],
      householdSizeSourceType: 'snapshot',
      sourceType: 'snapshot',
      sourceDate: String(item.sourceDate),
    }),
  )

const getLatestPublishedPeriod = () => {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
  }
}

const buildTownCodeLookup = (boundaries: BoundaryFeature[]) => {
  const pairs = boundaries.flatMap((feature) =>
    [...buildNameAliases(feature.properties.name), ...buildNameAliases(feature.properties.fullName ?? feature.properties.name)].map(
      (alias) => [normalizeAdminName(alias), feature.properties.adminCode] as const,
    ),
  )
  return new Map<string, string>(pairs)
}

const parseCsvRow = (line: string) => {
  const matches = [...line.matchAll(/"((?:[^"]|"")*)"|([^,]+)/g)]
  return matches.map((match) => (match[1] ?? match[2] ?? '').replaceAll('""', '"').trim())
}

const parseTarget = (value: string) => {
  const match = value.match(/^(.*?)\s*\((\d{10})\)$/)
  if (!match) return null
  return { name: match[1].trim(), moisCode: match[2] }
}

const parseTownCsv = (csv: string, boundaries: BoundaryFeature[], cityCode: string, sourceDate: string) => {
  const lookup = buildTownCodeLookup(boundaries)
  const records: PopulationStats[] = []
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)

  for (const line of lines) {
    const columns = parseCsvRow(line)
    if (columns.length < 6) continue

    const target = parseTarget(columns[0] ?? '')
    if (!target) continue
    const adminCode = lookup.get(normalizeAdminName(target.name))
    if (!adminCode) continue

    records.push(
      normalizePopulationRecord({
        adminCode,
        totalPopulation: columns[1],
        householdCount: columns[2] ?? 0,
        malePopulation: columns[4] ?? 0,
        femalePopulation: columns[5] ?? 0,
        sourceType: 'real',
        sourceDate,
      }),
    )
  }

  if (isDev) {
    console.log('[population:town:csv]', {
      cityCode,
      lineCount: lines.length,
      matchedCount: records.length,
      firstMatches: records.slice(0, 3).map((record) => ({
        adminCode: record.adminCode,
        totalPopulation: record.totalPopulation,
      })),
    })
  }

  return records
}

const parseTownAgeCsv = (csv: string, boundaries: BoundaryFeature[], cityCode: string, sourceDate: string) => {
  const lookup = buildTownCodeLookup(boundaries)
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    return new Map<string, PopulationStats>()
  }

  const headers = parseCsvRow(lines[0] ?? '')
  const ageLabels = [
    '0~4세',
    '5~9세',
    '10~14세',
    '15~19세',
    '20~24세',
    '25~29세',
    '30~34세',
    '35~39세',
    '40~44세',
    '45~49세',
    '50~54세',
    '55~59세',
    '60~64세',
    '65~69세',
    '70~74세',
    '75~79세',
    '80~84세',
    '85~89세',
    '90~94세',
    '95~99세',
    '100세 이상',
  ]

  const indexByLabel = new Map<string, number>()
  ageLabels.forEach((label) => {
    const index = headers.findIndex((header) => header.includes(`_계_${label}`))
    if (index >= 0) indexByLabel.set(label, index)
  })

  const totalIndex = headers.findIndex((header) => header.includes('_계_총인구수'))
  const maleIndex = headers.findIndex((header) => header.includes('_남_총인구수'))
  const femaleIndex = headers.findIndex((header) => header.includes('_여_총인구수'))

  const records = new Map<string, PopulationStats>()

  for (const line of lines.slice(1)) {
    const columns = parseCsvRow(line)
    const target = parseTarget(columns[0] ?? '')
    if (!target) continue
    const adminCode = lookup.get(normalizeAdminName(target.name))
    if (!adminCode) continue

    const ageDistribution = ageLabels
      .map((label) => {
        const index = indexByLabel.get(label)
        return index != null ? { label, value: Number(String(columns[index] ?? '0').replaceAll(',', '')) || 0 } : null
      })
      .filter((item): item is DistributionItem => Boolean(item))

    records.set(
      adminCode,
      normalizePopulationRecord({
        adminCode,
        totalPopulation: columns[totalIndex] ?? 0,
        householdCount: 0,
        malePopulation: columns[maleIndex] ?? 0,
        femalePopulation: columns[femaleIndex] ?? 0,
        age0to14: calculateAge0to14(ageDistribution),
        age15to64: calculateAge15to64(ageDistribution),
        age65plus: calculateSeniorPopulation(ageDistribution),
        ageDistribution,
        ageDistributionSourceType: 'real',
        sourceType: 'real',
        sourceDate,
      }),
    )
  }

  if (isDev) {
    console.log('[population:town:age]', {
      cityCode,
      normalizedAgeDistributionCount: [...records.values()].filter((record) => record.ageDistribution.length > 0).length,
      firstRecord: records.values().next().value ?? null,
    })
  }

  return records
}

const mergeRecords = (
  baseRecords: PopulationStats[],
  ageRecords: Map<string, PopulationStats>,
  snapshotRecords: PopulationStats[],
) => {
  const snapshotByCode = new Map(snapshotRecords.map((record) => [record.adminCode, record]))
  const householdSizeByCode = new Map(
    (gangseoTownHouseholdSizes as Array<{ adminCode: string; distribution: DistributionItem[] }>).map((entry) => [
      entry.adminCode,
      entry.distribution,
    ]),
  )

  return baseRecords.map((record) => {
    const ageRecord = ageRecords.get(record.adminCode)
    const snapshotRecord = snapshotByCode.get(record.adminCode)
    return normalizePopulationRecord({
      adminCode: record.adminCode,
      totalPopulation: record.totalPopulation,
      householdCount: record.householdCount,
      malePopulation: record.malePopulation,
      femalePopulation: record.femalePopulation,
      age0to14: ageRecord?.age0to14 ?? snapshotRecord?.age0to14 ?? 0,
      age15to64: ageRecord?.age15to64 ?? snapshotRecord?.age15to64 ?? 0,
      age65plus: ageRecord?.age65plus ?? snapshotRecord?.age65plus ?? 0,
      ageDistribution: ageRecord?.ageDistribution ?? snapshotRecord?.ageDistribution ?? [],
      householdSizeDistribution: householdSizeByCode.get(record.adminCode) ?? snapshotRecord?.householdSizeDistribution ?? [],
      ageDistributionSourceType: ageRecord?.ageDistribution.length ? 'real' : snapshotRecord?.ageDistribution.length ? 'snapshot' : undefined,
      householdSizeSourceType: householdSizeByCode.has(record.adminCode) ? 'snapshot' : snapshotRecord?.householdSizeDistribution.length ? 'snapshot' : undefined,
      sourceType: record.sourceType,
      sourceDate: record.sourceDate,
    })
  })
}

export const fetchTownPopulation = async (
  cityCode: string,
  boundaries: BoundaryFeature[],
): Promise<PopulationApiResult> => {
  const requestedAt = new Date().toISOString()
  const snapshotRecords = getSnapshot()
  const canUseReal =
    APP_CONFIG.dataMode === 'real' &&
    Boolean(APP_CONFIG.mois.apiKey) &&
    Boolean(APP_CONFIG.mois.baseUrl.trim())

  if (!canUseReal) {
    return {
      records: snapshotRecords,
      sourceType: 'snapshot',
      fallbackReason: 'missing_api_key',
      requestedAt,
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
    }
  }

  try {
    const url = buildRuntimeUrl(APP_CONFIG.mois.baseUrl, `${APP_CONFIG.mois.path}/${CSV_OPERATION}`)
    url.searchParams.set('searchYearMonth', 'month')
    url.searchParams.set('xlsStats', '3')

    const period = getLatestPublishedPeriod()
    const city = getCityByCode(cityCode)
    const moisComparableCode = city?.sgisCode ?? cityCode
    const sltOrgLvl1 = moisComparableCode.slice(0, 2)
    const sltOrgLvl2 = moisComparableCode.slice(2, 5)

    const formBody = new URLSearchParams({
      serviceKey: APP_CONFIG.mois.apiKey,
      sltOrgType: '2',
      sltOrgLvl1,
      sltOrgLvl2,
      gender: 'gender',
      genderPer: 'genderPer',
      generation: 'generation',
      searchYearStart: period.year,
      searchMonthStart: period.month,
      searchYearEnd: period.year,
      searchMonthEnd: period.month,
      sltOrderType: '1',
      sltOrderValue: 'ASC',
      category: 'month',
    })

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    })

    const statusCode = response.status
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') ?? ''
    const text =
      contentType.includes('octet-stream') || contentType.includes('csv')
        ? new TextDecoder('euc-kr').decode(buffer)
        : new TextDecoder().decode(buffer)
    const responseKind = text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html') ? 'html' : 'csv'

    if (isDev) {
      console.log('[population:town:request]', {
        cityCode,
        sltOrgLvl1,
        sltOrgLvl2,
        period,
        requestUrl: url.toString(),
        statusCode,
        responseKind,
        contentType,
        preview: text.slice(0, 180),
      })
    }

    if (!response.ok) {
      return {
        records: snapshotRecords,
        sourceType: 'snapshot',
        fallbackReason: statusCode === 404 ? 'not_found' : 'server_error',
        requestUrl: url.toString(),
        statusCode,
        requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: false,
      }
    }

    if (responseKind === 'html') {
      const fallbackReason = text.includes('오류페이지') || text.includes('요청하신 페이지를 찾을 수 없습니다') ? 'not_found' : 'parse_error'
      if (isDev) {
        console.warn('[population:town:empty]', {
          cityCode,
          requestUrl: url.toString(),
          statusCode,
          responseKind,
          reason: fallbackReason,
        })
      }
      return {
        records: snapshotRecords,
        sourceType: 'snapshot',
        fallbackReason,
        requestUrl: url.toString(),
        statusCode,
        requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: false,
      }
    }

    const records = parseTownCsv(text, boundaries, cityCode, `${period.year}-${period.month}-01`)
    const ageUrl = buildRuntimeUrl(APP_CONFIG.mois.baseUrl, `${APP_CONFIG.mois.path}/${AGE_CSV_OPERATION}`)
    ageUrl.searchParams.set('searchYearMonth', 'month')
    ageUrl.searchParams.set('xlsStats', '3')
    const ageBody = new URLSearchParams({
      serviceKey: APP_CONFIG.mois.apiKey,
      sltOrgType: '2',
      sltOrgLvl1,
      sltOrgLvl2,
      gender: 'gender',
      sum: 'sum',
      sltUndefType: '',
      searchYearStart: period.year,
      searchMonthStart: period.month,
      searchYearEnd: period.year,
      searchMonthEnd: period.month,
      sltOrderType: '1',
      sltOrderValue: 'ASC',
      sltArgTypes: '5',
      sltArgTypeA: '0',
      sltArgTypeB: '100',
      category: 'month',
    })
    const ageResponse = await fetch(ageUrl.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: ageBody.toString(),
    })
    const ageBuffer = await ageResponse.arrayBuffer()
    const ageText = new TextDecoder('euc-kr').decode(ageBuffer)
    const ageKind = ageText.trim().startsWith('<!DOCTYPE html') || ageText.trim().startsWith('<html') ? 'html' : 'csv'
    if (isDev) {
      console.log('[population:town:age:request]', {
        cityCode,
        requestUrl: ageUrl.toString(),
        statusCode: ageResponse.status,
        responseKind: ageKind,
        preview: ageText.slice(0, 180),
      })
    }
    const ageRecords =
      ageResponse.ok && ageKind === 'csv'
        ? parseTownAgeCsv(ageText, boundaries, cityCode, `${period.year}-${period.month}-01`)
        : new Map<string, PopulationStats>()
    const mergedRecords = mergeRecords(records, ageRecords, snapshotRecords)

    if (isDev) {
      console.log('[population:town:normalized]', {
        cityCode,
        requestUrl: url.toString(),
        ageRequestUrl: ageUrl.toString(),
        normalizedCount: mergedRecords.length,
        normalizedAgeDistributionCount: mergedRecords.filter((record) => record.ageDistribution.length > 0).length,
        normalizedHouseholdSizeDistributionCount: mergedRecords.filter((record) => record.householdSizeDistribution.length > 0).length,
        youthRatio: mergedRecords[0]?.youthRatio ?? null,
        agingRatio: mergedRecords[0]?.agingRatio ?? null,
        zeroCountReason: mergedRecords.length === 0 ? 'csv_parsed_but_no_boundary_join_match' : 'none',
        firstRecord: mergedRecords[0] ?? null,
      })
    }

    return {
      records: mergedRecords.length ? mergedRecords : snapshotRecords,
      sourceType: mergedRecords.length ? 'real' : 'snapshot',
      fallbackReason: mergedRecords.length ? 'none' : 'empty_result',
      selectedSourceReason: mergedRecords.length
        ? ageRecords.size > 0
          ? 'MOIS 기본 인구 + 5세 단위 연령 실데이터 사용, 세대원수별은 snapshot 보강'
          : 'MOIS 기본 인구 실데이터 사용, 연령/세대원수별은 snapshot 보강'
        : 'MOIS real 응답을 정규화하지 못해 snapshot 사용',
      requestUrl: `${url.toString()} | age:${ageUrl.toString()}`,
      statusCode,
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: mergedRecords.length > 0,
    }
  } catch (error) {
    if (isDev) {
      console.warn('[population:town:fallback]', error)
    }

    return {
      records: snapshotRecords,
      sourceType: 'snapshot',
      fallbackReason: 'parse_error',
      requestUrl: undefined,
      requestedAt,
      requestSent: true,
      responseReceived: false,
      parseSuccess: false,
    }
  }
}
