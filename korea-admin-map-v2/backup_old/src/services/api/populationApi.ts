import populationSnapshot from '../../data/snapshot/population.sample.json'
import { APP_CONFIG, isDev } from '../../config/app'
import { fromMoisCode, toMoisCode } from '../../utils/adminCode'
import { buildNameAliases, normalizeAdminName } from '../../utils/adminName'
import { normalizePopulationRecord } from '../../utils/populationNormalizer'
import { getTownsByCity } from '../adminService'
import { buildRuntimeUrl } from '../../utils/url'
import type { PopulationStats } from '../../types/population'

type PopulationApiResult = {
  records: PopulationStats[]
  sourceType: 'real' | 'snapshot' | 'mock'
  fallbackReason: string
  requestUrl?: string
  statusCode?: number
  requestedAt: string
  requestSent: boolean
  responseReceived: boolean
  parseSuccess: boolean
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

const getSnapshot = (adminLevel: 'province' | 'city' | 'town') =>
  (populationSnapshot as Array<Record<string, unknown>>)
    .filter((item) => item.adminLevel === adminLevel)
    .map((item) =>
      normalizePopulationRecord({
        adminCode: String(item.adminCode),
        totalPopulation: Number(item.totalPopulation),
        householdCount: Number(item.householdCount),
        malePopulation: Number(item.malePopulation),
        femalePopulation: Number(item.femalePopulation),
        age0to14: Number(item.age0to9) + Number(item.age10to19 || 0) * 0.5,
        age15to64:
          Number(item.age10to19 || 0) * 0.5 +
          Number(item.age20to29) +
          Number(item.age30to39) +
          Number(item.age40to49) +
          Number(item.age50to59) +
          Number(item.age60to64),
        age65plus: Number(item.age65plus),
        sourceType: 'snapshot',
        sourceDate: String(item.sourceDate),
      }),
    )

const parseProvinceOrCityCsv = (csv: string, adminLevel: 'province' | 'city', sourceType: 'real' | 'snapshot') =>
  csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map(parseCsvRow)
    .map((row) => {
      const target = parseTarget(row[0] ?? '')
      if (!target) return null
      const adminCode = fromMoisCode(target.moisCode)
      if (!adminCode) return null
      if ((adminLevel === 'province' && adminCode.length !== 2) || (adminLevel === 'city' && adminCode.length !== 5)) {
        return null
      }
      return normalizePopulationRecord({
        adminCode,
        totalPopulation: row[1],
        householdCount: row[2],
        malePopulation: row[4],
        femalePopulation: row[5],
        sourceType,
        sourceDate: `${new Date().getFullYear()}-01-01`,
      })
    })
    .filter((item): item is PopulationStats => Boolean(item))

const parseTownHtml = (html: string, cityCode: string) => {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  const records: PopulationStats[] = []
  const townCatalog = getTownsByCity(cityCode)
  for (const row of rows) {
    const columns = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) =>
      match[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim(),
    )
    const name = columns[0]
    if (!name || !/\d/.test(columns[1] ?? '')) continue
    const town = townCatalog.find((item) =>
      buildNameAliases(item.name).some((alias) => {
        const candidate = normalizeAdminName(alias)
        const target = normalizeAdminName(name)
        return target === candidate || target.endsWith(candidate)
      }),
    )
    if (!town) continue
    records.push(
      normalizePopulationRecord({
        adminCode: town.townCode,
        totalPopulation: columns[1],
        householdCount: columns[2] ?? 0,
        malePopulation: columns[3] ?? 0,
        femalePopulation: columns[4] ?? 0,
        sourceType: 'real',
        sourceDate: `${new Date().getFullYear()}-01-01`,
      }),
    )
  }
  return records
}

export const fetchPopulationByLevel = async (
  adminLevel: 'province' | 'city' | 'town',
  adminCode?: string,
): Promise<PopulationApiResult> => {
  const requestedAt = new Date().toISOString()
  const canUseReal = APP_CONFIG.dataMode === 'real' && Boolean(APP_CONFIG.mois.apiKey)
  const snapshotRecords = getSnapshot(adminLevel)

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
    const path =
      adminLevel === 'town'
        ? `${APP_CONFIG.mois.path}/statMonth.do`
        : `${APP_CONFIG.mois.path}/downloadCsv.do`
    const url = buildRuntimeUrl(APP_CONFIG.mois.baseUrl, path)
    url.searchParams.set('serviceKey', APP_CONFIG.mois.apiKey)
    if (adminLevel === 'province') {
      url.searchParams.set('searchYearMonth', 'month')
      url.searchParams.set('xlsStats', '1')
    } else if (adminLevel === 'city') {
      url.searchParams.set('searchYearMonth', 'month')
      url.searchParams.set('xlsStats', '2')
    } else {
      url.searchParams.set('searchYearMonth', 'month')
      url.searchParams.set('sltOrgType', '1')
      url.searchParams.set('sltOrgLvl1', toMoisCode(adminCode ?? '').slice(0, 2))
      url.searchParams.set('sltOrgLvl2', toMoisCode(adminCode ?? '').slice(2, 5))
      url.searchParams.set('sltOrgLvl3', toMoisCode(adminCode ?? '').slice(5))
    }
    const response = await fetch(url.toString())
    const statusCode = response.status
    const text = await response.text()

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

    const records =
      adminLevel === 'town'
        ? parseTownHtml(text, adminCode ?? '')
        : parseProvinceOrCityCsv(text, adminLevel, 'real')

    if (isDev) {
      console.info('[population:api]', {
        adminLevel,
        adminCode,
        requestUrl: url.toString(),
        statusCode,
        normalizedCount: records.length,
        preview: text.slice(0, 160),
      })
    }

    return {
      records: records.length ? records : snapshotRecords,
      sourceType: records.length ? 'real' : 'snapshot',
      fallbackReason: records.length ? 'none' : 'empty_result',
      requestUrl: url.toString(),
      statusCode,
      requestedAt,
      requestSent: true,
      responseReceived: true,
      parseSuccess: true,
    }
  } catch (error) {
    if (isDev) console.warn('[population:fallback]', error)
    return {
      records: snapshotRecords,
      sourceType: 'snapshot',
      fallbackReason: 'parse_error',
      requestedAt,
      requestSent: true,
      responseReceived: false,
      parseSuccess: false,
    }
  }
}
