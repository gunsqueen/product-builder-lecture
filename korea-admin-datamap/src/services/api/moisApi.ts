import { APP_CONFIG } from '@/config/app'
import { getCityCatalog, getTownCatalog } from '@/services/adminService'
import type { AdminCode, AdminLevel, CityCode, ProvinceCode } from '@/types/admin'
import type { PopulationStats, RawPopulationInput } from '@/types/population'
import { createAdminAreaNameAliases, normalizeAdminAreaName } from '@/utils/adminName'
import { getAdminLevelFromCode } from '@/utils/adminCode'
import { createApiRequestError } from '@/utils/apiRequestError'
import { normalizePopulationCollection } from '@/utils/populationNormalizer'

const CSV_DOWNLOAD_OPERATION = 'downloadCsv.do'
const TOWN_HTML_OPERATION = 'statMonth.do'

type MoisResponseType = 'csv' | 'html'

interface MoisPopulationFetchResult {
  records: PopulationStats[]
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
  responsePreview?: string
}

interface MoisPopulationRequest {
  url: URL
  requestInit: RequestInit
  responseType: MoisResponseType
  sourceDate: string
  requestedAt: string
}

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

const joinUrlParts = (...parts: Array<string | undefined>) => {
  const segments = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  if (segments.length === 0) {
    return ''
  }

  const [base, ...rest] = segments
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base

  if (rest.length === 0) {
    return normalizedBase
  }

  return `${normalizedBase}/${rest.map((segment) => trimSlashes(segment)).join('/')}`
}

const resolveRuntimeOrigin = () =>
  typeof window === 'undefined' ? 'http://localhost' : window.location.origin

const getMoisBaseUrl = () => APP_CONFIG.moisApiBaseUrl?.trim() ?? ''
const getMoisPathPrefix = () => APP_CONFIG.moisApiPath?.trim() ?? ''

const buildMoisEndpointUrl = (
  operationPath: string,
  queryParams?: Record<string, string>,
) => {
  const endpoint = joinUrlParts(getMoisBaseUrl(), getMoisPathPrefix(), operationPath)
  const url = new URL(endpoint, resolveRuntimeOrigin())

  Object.entries(queryParams ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url
}

const formatMonth = (value: number) => String(value).padStart(2, '0')

const getReferenceMonth = () => {
  const target = new Date()
  target.setDate(1)
  target.setMonth(target.getMonth() - 1)

  const year = String(target.getFullYear())
  const month = formatMonth(target.getMonth() + 1)

  return {
    year,
    month,
    sourceDate: `${year}-${month}-01`,
  }
}

const toMoisCode = (adminCode: AdminCode) => {
  if (adminCode.length === 2) {
    return `${adminCode}00000000`
  }

  if (adminCode.length === 5) {
    return `${adminCode}00000`
  }

  return adminCode
}

const toOfficialCode = (moisCode: string): AdminCode | null => {
  const normalized = moisCode.trim()

  if (!/^\d{10}$/.test(normalized)) {
    return null
  }

  if (normalized === '1000000000') {
    return null
  }

  if (normalized.endsWith('00000000')) {
    return normalized.slice(0, 2) as ProvinceCode
  }

  if (normalized.endsWith('00000')) {
    return normalized.slice(0, 5) as CityCode
  }

  return normalized as AdminCode
}

const getProvinceCodeFromAdminCode = (adminCode: AdminCode): ProvinceCode =>
  adminCode.slice(0, 2) as ProvinceCode

const getCityCodeFromAdminCode = (adminCode: AdminCode): CityCode =>
  adminCode.slice(0, 5) as CityCode

const parseNumericValue = (value: string | undefined) =>
  value ? Number(value.replaceAll(',', '').trim()) : 0

const parseQuotedCsvLine = (line: string) => {
  const matches = [...line.matchAll(/"((?:[^"]|"")*)"|([^,]+)/g)]

  if (matches.length === 0) {
    return []
  }

  return matches.map((match) => (match[1] ?? match[2] ?? '').replaceAll('""', '"').trim())
}

const extractNameAndCode = (value: string) => {
  const match = value.match(/^(.*?)\s*\((\d{10})\)$/)

  if (!match) {
    return null
  }

  return {
    name: match[1].trim(),
    moisCode: match[2],
  }
}

const createPopulationInput = (
  adminCode: AdminCode,
  sourceDate: string,
  metrics: {
    totalPopulation: number
    householdCount: number
    malePopulation: number
    femalePopulation: number
  },
): RawPopulationInput => ({
  adminCode,
  adminLevel: getAdminLevelFromCode(adminCode),
  totalPopulation: metrics.totalPopulation,
  householdCount: metrics.householdCount,
  malePopulation: metrics.malePopulation,
  femalePopulation: metrics.femalePopulation,
  sourceDate,
})

const parseProvinceCsv = (csv: string, sourceDate: string) => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines
    .slice(1)
    .map((line) => parseQuotedCsvLine(line))
    .map((columns) => {
      const target = extractNameAndCode(columns[0] ?? '')

      if (!target) {
        return null
      }

      const officialCode = toOfficialCode(target.moisCode)

      if (!officialCode || officialCode.length !== 2) {
        return null
      }

      return createPopulationInput(officialCode, sourceDate, {
        totalPopulation: parseNumericValue(columns[1]),
        householdCount: parseNumericValue(columns[2]),
        malePopulation: parseNumericValue(columns[4]),
        femalePopulation: parseNumericValue(columns[5]),
      })
    })
    .filter((record): record is RawPopulationInput => Boolean(record))
}

const parseCityCsv = (csv: string, sourceDate: string) => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines
    .slice(1)
    .map((line) => parseQuotedCsvLine(line))
    .map((columns) => {
      const target = extractNameAndCode(columns[0] ?? '')

      if (!target) {
        return null
      }

      const officialCode = toOfficialCode(target.moisCode)

      if (!officialCode || officialCode.length !== 5) {
        return null
      }

      return createPopulationInput(officialCode, sourceDate, {
        totalPopulation: parseNumericValue(columns[1]),
        householdCount: parseNumericValue(columns[2]),
        malePopulation: parseNumericValue(columns[4]),
        femalePopulation: parseNumericValue(columns[5]),
      })
    })
    .filter((record): record is RawPopulationInput => Boolean(record))
}

const createTownAliasMap = (cityCode: CityCode) => {
  const aliasMap = new Map<string, AdminCode>()
  const towns = getTownCatalog().filter((town) => town.cityCode === cityCode)

  towns.forEach((town) => {
    const aliases = [
      ...createAdminAreaNameAliases(town.name),
      ...createAdminAreaNameAliases(town.shortName),
    ]

    aliases.forEach((alias) => {
      aliasMap.set(normalizeAdminAreaName(alias), town.code)
    })
  })

  return aliasMap
}

const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const parseTownHtml = (html: string, cityCode: CityCode, sourceDate: string) => {
  const aliasMap = createTownAliasMap(cityCode)
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  const records: RawPopulationInput[] = []

  rows.forEach((rowMatch) => {
    const row = rowMatch[1]

    if (!row.includes('td_admin')) {
      return
    }

    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
      stripHtml(match[1]),
    )

    if (cells.length < 6) {
      return
    }

    const rowLevel = cells[0]
    const name = cells[1]

    if (rowLevel === '0') {
      return
    }

    const normalizedName = normalizeAdminAreaName(name)
    const officialCode = aliasMap.get(normalizedName)

    if (!officialCode) {
      return
    }

    records.push(
      createPopulationInput(officialCode, sourceDate, {
        totalPopulation: parseNumericValue(cells[2]),
        householdCount: parseNumericValue(cells[3]),
        malePopulation: parseNumericValue(cells[5]),
        femalePopulation: parseNumericValue(cells[6]),
      }),
    )
  })

  return records
}

const decodeMoisCsv = async (response: Response) => {
  const buffer = await response.arrayBuffer()

  try {
    return new TextDecoder('euc-kr').decode(buffer)
  } catch {
    return new TextDecoder().decode(buffer)
  }
}

const buildCommonFormData = () => {
  const { year, month, sourceDate } = getReferenceMonth()

  return {
    year,
    month,
    sourceDate,
    commonParams: {
      searchYearStart: year,
      searchMonthStart: month,
      searchYearEnd: year,
      searchMonthEnd: month,
      searchYearMonth: 'month',
      category: 'month',
      gender: 'gender',
      genderPer: 'genderPer',
      generation: 'generation',
      serviceKey: APP_CONFIG.moisApiKey,
      ServiceKey: APP_CONFIG.moisApiKey,
    },
  }
}

const buildProvinceRequest = (): MoisPopulationRequest => {
  const { commonParams, sourceDate } = buildCommonFormData()
  const requestedAt = new Date().toISOString()
  const url = buildMoisEndpointUrl(CSV_DOWNLOAD_OPERATION, {
    searchYearMonth: 'month',
    xlsStats: '1',
  })

  return {
    url,
    responseType: 'csv',
    sourceDate,
    requestedAt,
    requestInit: {
      method: 'POST',
      headers: {
        Accept: 'text/csv, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        sltOrgType: '1',
        sltOrgLvl1: 'A',
        sltOrgLvl2: 'A',
        ...commonParams,
      }),
    },
  }
}

const buildCityRequest = (provinceCode: ProvinceCode): MoisPopulationRequest => {
  const { commonParams, sourceDate } = buildCommonFormData()
  const requestedAt = new Date().toISOString()
  const url = buildMoisEndpointUrl(CSV_DOWNLOAD_OPERATION, {
    searchYearMonth: 'month',
    xlsStats: '2',
  })

  return {
    url,
    responseType: 'csv',
    sourceDate,
    requestedAt,
    requestInit: {
      method: 'POST',
      headers: {
        Accept: 'text/csv, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        sltOrgType: '2',
        sltOrgLvl1: toMoisCode(provinceCode),
        sltOrgLvl2: 'A',
        ...commonParams,
      }),
    },
  }
}

const buildTownRequest = (cityCode: CityCode): MoisPopulationRequest => {
  const { commonParams, year, sourceDate } = buildCommonFormData()
  const requestedAt = new Date().toISOString()
  const url = buildMoisEndpointUrl(TOWN_HTML_OPERATION)

  return {
    url,
    responseType: 'html',
    sourceDate,
    requestedAt,
    requestInit: {
      method: 'POST',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        sltOrgType: '2',
        sltOrgLvl1: toMoisCode(getProvinceCodeFromAdminCode(cityCode)),
        sltOrgLvl2: toMoisCode(cityCode),
        nowYear: year,
        ...commonParams,
      }),
    },
  }
}

const buildPopulationRequest = (
  adminCode?: AdminCode,
  targetLevel?: AdminLevel,
): MoisPopulationRequest => {
  if (targetLevel === 'province') {
    return buildProvinceRequest()
  }

  if (targetLevel === 'city') {
    return buildCityRequest(getProvinceCodeFromAdminCode((adminCode ?? '11') as AdminCode))
  }

  if (targetLevel === 'town') {
    return buildTownRequest(getCityCodeFromAdminCode((adminCode ?? '11110') as AdminCode))
  }

  if (!adminCode || adminCode.length === 2) {
    return buildProvinceRequest()
  }

  if (adminCode.length === 5) {
    return buildCityRequest(getProvinceCodeFromAdminCode(adminCode))
  }

  return buildTownRequest(getCityCodeFromAdminCode(adminCode))
}

const buildRequestUrlForAdminCode = (adminCode?: AdminCode, targetLevel?: AdminLevel) =>
  buildPopulationRequest(adminCode, targetLevel).url

export const hasMoisApiConfig = () => Boolean(APP_CONFIG.moisApiKey)

export const buildMoisPopulationRequestUrl = (
  adminCode?: AdminCode,
  targetLevel?: AdminLevel,
) => buildRequestUrlForAdminCode(adminCode, targetLevel)

export const fetchPopulationFromMoisApi = async (
  adminCode?: AdminCode,
  targetLevel?: AdminLevel,
): Promise<MoisPopulationFetchResult | null> => {
  if (!hasMoisApiConfig()) {
    return null
  }

  const request = buildPopulationRequest(adminCode, targetLevel)
  let response: Response

  try {
    response = await fetch(request.url, request.requestInit)
  } catch (error) {
    throw createApiRequestError(
      error instanceof Error ? error.message : 'MOIS API network request failed',
      {
        requestUrl: request.url.toString(),
        requestedAt: request.requestedAt,
        requestSent: true,
        responseReceived: false,
        parseSuccess: false,
      },
    )
  }

  if (!response.ok) {
    const responsePreview = (await response.text()).slice(0, 500)
    throw createApiRequestError(`MOIS API request failed: ${response.status}`, {
      statusCode: response.status,
      requestUrl: request.url.toString(),
      requestedAt: request.requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: false,
      responsePreview,
    })
  }

  let rawRecords: RawPopulationInput[]
  let responsePreview = ''

  try {
    if (request.responseType === 'csv') {
      const csv = await decodeMoisCsv(response)
      responsePreview = csv.split(/\r?\n/).slice(0, 5).join('\n').slice(0, 500)
      rawRecords =
        !adminCode || adminCode.length === 2
          ? parseProvinceCsv(csv, request.sourceDate)
          : parseCityCsv(csv, request.sourceDate)
    } else {
      const html = await response.text()
      responsePreview = stripHtml(html).slice(0, 500)
      rawRecords = parseTownHtml(html, getCityCodeFromAdminCode(adminCode as AdminCode), request.sourceDate)
    }
  } catch (error) {
    throw createApiRequestError(
      error instanceof Error ? error.message : 'MOIS API response parse failed',
      {
        statusCode: response.status,
        requestUrl: request.url.toString(),
        requestedAt: request.requestedAt,
        requestSent: true,
        responseReceived: true,
        parseSuccess: false,
        responsePreview,
      },
    )
  }

  return {
    records: normalizePopulationCollection(rawRecords, 'real'),
    requestSent: true,
    responseReceived: true,
    parseSuccess: true,
    responsePreview,
  }
}

export const getMoisRequestTargetSummary = (adminCode?: AdminCode) => {
  if (!adminCode) {
    return {
      level: 'province' as const,
      requestUrl: buildRequestUrlForAdminCode(undefined).toString(),
    }
  }

  return {
    level: getAdminLevelFromCode(adminCode),
    requestUrl: buildRequestUrlForAdminCode(adminCode).toString(),
  }
}

export const getMoisCityNameByCode = (cityCode: CityCode) =>
  getCityCatalog().find((city) => city.code === cityCode)?.name ?? null
