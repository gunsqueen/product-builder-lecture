import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'))
const loadEnvFile = (filename) => {
  const filePath = path.join(rootDir, filename)

  if (!fs.existsSync(filePath)) {
    return {}
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=')
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )
}

const env = {
  ...loadEnvFile('.env'),
  ...loadEnvFile('.env.local'),
  ...process.env,
}

const provinces = readJson('src/data/admin/provinces.json')
const cities = readJson('src/data/admin/cities.json')
const towns = readJson('src/data/admin/towns.json')

const normalize = (value = '') => value.replaceAll(' ', '').replace(/제(?=\d)/g, '').trim()
const aliases = (value = '') => [...new Set([value, value.replace(/제(?=\d)/g, '')].map((item) => item.trim()).filter(Boolean))]

const provinceByName = new Map()
for (const province of provinces) {
  for (const alias of [...aliases(province.name), ...aliases(province.shortName)]) {
    provinceByName.set(normalize(alias), province)
  }
}

const provinceDisplayNameAliases = new Map([
  ['51', ['강원특별자치도', '강원도']],
  ['52', ['전북특별자치도', '전라북도']],
])

const provinceNameByCode = new Map(provinces.map((province) => [province.provinceCode, province.name]))

const cityByFullName = new Map()
for (const city of cities) {
  const provinceName = provinceNameByCode.get(city.provinceCode) ?? ''

  for (const alias of aliases(city.name)) {
    cityByFullName.set(normalize(`${provinceName} ${alias}`), city)
  }

  for (const provinceAlias of provinceDisplayNameAliases.get(city.provinceCode) ?? []) {
    for (const alias of aliases(city.name)) {
      cityByFullName.set(normalize(`${provinceAlias} ${alias}`), city)
    }
  }
}

const townByFullName = new Map()
for (const town of towns) {
  const provinceName = provinceNameByCode.get(town.provinceCode) ?? ''
  const cityName = cities.find((city) => city.cityCode === town.cityCode)?.name ?? ''

  for (const alias of aliases(town.name)) {
    townByFullName.set(normalize(`${provinceName} ${cityName} ${alias}`), town)
  }

  for (const provinceAlias of provinceDisplayNameAliases.get(town.provinceCode) ?? []) {
    for (const alias of aliases(town.name)) {
      townByFullName.set(normalize(`${provinceAlias} ${cityName} ${alias}`), town)
    }
  }
}

const serviceId = env.VITE_SGIS_SERVICE_ID
const securityKey = env.VITE_SGIS_SECURITY_KEY
const baseUrl = env.VITE_SGIS_API_BASE_URL || 'https://sgisapi.mods.go.kr'

if (!serviceId || !securityKey) {
  console.error('VITE_SGIS_SERVICE_ID or VITE_SGIS_SECURITY_KEY is missing')
  process.exit(1)
}

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`)
  }
  return response.json()
}

const tokenPayload = await fetchJson(
  `${baseUrl}/OpenAPI3/auth/authentication.json?consumer_key=${serviceId}&consumer_secret=${securityKey}`,
)
const accessToken = tokenPayload.result?.accessToken

if (!accessToken) {
  throw new Error('Could not issue SGIS access token')
}

const fetchBoundaries = (params = {}) => {
  const url = new URL('/OpenAPI3/boundary/hadmarea.geojson', baseUrl)
  url.searchParams.set('accessToken', accessToken)
  url.searchParams.set('year', '2025')

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  return fetchJson(url.toString())
}

const provinceRaw = await fetchBoundaries()
const provinceCodeMap = new Map()

for (const feature of provinceRaw.features) {
  const province = provinceByName.get(normalize(String(feature.properties?.adm_nm ?? '')))
  if (province) {
    provinceCodeMap.set(province.provinceCode, String(feature.properties?.adm_cd))
  }
}

const summarizeTownCheck = async (cityCode) => {
  const city = cities.find((item) => item.cityCode === cityCode)
  if (!city) {
    return { cityCode, error: 'city not found in master' }
  }

  const provinceRawCode = provinceCodeMap.get(city.provinceCode)
  if (!provinceRawCode) {
    return { cityCode, cityName: city.name, error: 'province raw code not found' }
  }

  const cityRaw = await fetchBoundaries({ adm_cd: provinceRawCode, low_search: '1' })
  const rawCityFeature = cityRaw.features.find((feature) => {
    const normalized = normalize(String(feature.properties?.adm_nm ?? ''))
    return cityByFullName.get(normalized)?.cityCode === cityCode
  })

  if (!rawCityFeature) {
    return { cityCode, cityName: city.name, error: 'city raw feature not found' }
  }

  const townRaw = await fetchBoundaries({
    adm_cd: String(rawCityFeature.properties?.adm_cd ?? ''),
    low_search: '1',
  })

  const matched = townRaw.features.filter((feature) => {
    const normalized = normalize(String(feature.properties?.adm_nm ?? ''))
    const town = townByFullName.get(normalized)
    return town?.cityCode === cityCode
  })

  return {
    cityCode,
    cityName: city.name,
    rawCount: townRaw.features.length,
    matchedCount: matched.length,
    expectedCount: towns.filter((town) => town.cityCode === cityCode).length,
    missingSamples: townRaw.features
      .map((feature) => String(feature.properties?.adm_nm ?? ''))
      .filter((name) => {
        const town = townByFullName.get(normalize(name))
        return town?.cityCode !== cityCode
      })
      .slice(0, 8),
  }
}

const provinceChecks = ['11', '26', '41'].map((provinceCode) => ({
  provinceCode,
  provinceName: provinces.find((province) => province.provinceCode === provinceCode)?.name,
  expectedCount: cities.filter((city) => {
    if (city.provinceCode !== provinceCode) {
      return false
    }

    if (city.adminType === 'district') {
      return true
    }

    const hasChildDistricts = cities.some(
      (candidate) =>
        candidate.provinceCode === provinceCode &&
        candidate.adminType === 'district' &&
        candidate.name.startsWith(`${city.name} `),
    )

    return !hasChildDistricts
  }).length,
}))

for (const check of provinceChecks) {
  const rawProvinceCode = provinceCodeMap.get(check.provinceCode)
  const rawCity = rawProvinceCode
    ? await fetchBoundaries({ adm_cd: rawProvinceCode, low_search: '1' })
    : null
  const matchedCount =
    rawCity?.features.filter((feature) =>
      Boolean(cityByFullName.get(normalize(String(feature.properties?.adm_nm ?? '')))),
    ).length ?? 0

  check.rawCount = rawCity?.features.length ?? 0
  check.matchedCount = matchedCount
}

const townChecks = await Promise.all(
  ['11500', '41111', '41131', '41281', '41465', '41590'].map((cityCode) =>
    summarizeTownCheck(cityCode),
  ),
)

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      provinceChecks,
      townChecks,
    },
    null,
    2,
  ),
)
