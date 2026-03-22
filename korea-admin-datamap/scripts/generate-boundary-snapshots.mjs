import fs from 'node:fs'
import path from 'node:path'
import proj4 from 'proj4'

const ROOT_DIR = process.cwd()
const GEO_DIR = path.join(ROOT_DIR, 'src', 'data', 'geo')
const PROVINCES_OUTPUT_PATH = path.join(GEO_DIR, 'provinces', 'koreaProvinces.ts')
const CITIES_OUTPUT_DIR = path.join(GEO_DIR, 'cities')
const ENV_PATH = path.join(ROOT_DIR, '.env.local')
const APP_ENV_PATH = path.join(ROOT_DIR, '.env')

const EPSG_5179 = 'EPSG:5179'
const EPSG_4326 = 'EPSG:4326'

proj4.defs(
  EPSG_5179,
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
)

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=')
        if (separatorIndex < 0) {
          return [line, '']
        }
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )
}

const env = {
  ...parseEnvFile(APP_ENV_PATH),
  ...parseEnvFile(ENV_PATH),
  ...process.env,
}

const SGIS_SERVICE_ID = env.VITE_SGIS_SERVICE_ID
const SGIS_SECURITY_KEY = env.VITE_SGIS_SECURITY_KEY
const SGIS_API_BASE_URL = env.VITE_SGIS_API_BASE_URL || 'https://sgisapi.kostat.go.kr'
const SGIS_AUTH_PATH = env.VITE_SGIS_AUTH_PATH || '/OpenAPI3/auth/authentication.json'
const SGIS_BOUNDARY_PATH = env.VITE_SGIS_BOUNDARY_PATH || '/OpenAPI3/boundary/hadmarea.geojson'
const SGIS_BOUNDARY_YEAR = env.VITE_SGIS_BOUNDARY_YEAR || '2025'

if (!SGIS_SERVICE_ID || !SGIS_SECURITY_KEY) {
  throw new Error('Missing SGIS credentials in .env.local or environment.')
}

const normalizeCityName = (value) => value.trim()

const provinces = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'src', 'data', 'admin', 'provinces.json'), 'utf8'),
)
const cities = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'src', 'data', 'admin', 'cities.json'), 'utf8'),
).map((city) => ({
  ...city,
  name: normalizeCityName(city.name),
}))

const provinceByName = new Map(provinces.map((province) => [province.name, province]))
const provinceNameAliases = new Map([
  ['강원도', '51'],
  ['전라북도', '52'],
])
for (const [aliasName, provinceCode] of provinceNameAliases) {
  const province = provinces.find((record) => record.provinceCode === provinceCode)
  if (province) {
    provinceByName.set(aliasName, province)
  }
}
const provinceNameByCode = new Map(provinces.map((province) => [province.provinceCode, province.name]))
const provinceDisplayNameAliases = new Map([
  ['51', ['강원특별자치도', '강원도']],
  ['52', ['전북특별자치도', '전라북도']],
])
const cityByFullName = new Map(
  cities.map((city) => [`${provinceNameByCode.get(city.provinceCode) ?? ''} ${city.name}`, city]),
)
for (const city of cities) {
  const aliases = provinceDisplayNameAliases.get(city.provinceCode) ?? []
  aliases.forEach((provinceName) => {
    cityByFullName.set(`${provinceName} ${city.name}`, city)
  })
}
const sejongCity = cities.find((city) => city.cityCode === '36110')
if (sejongCity) {
  cityByFullName.set('세종특별자치시 세종시', sejongCity)
}

const provinceFileAliases = {
  '11': 'seoulCities',
  '26': 'busanCities',
  '27': 'daeguCities',
  '28': 'incheonCities',
  '29': 'gwangjuCities',
  '30': 'daejeonCities',
  '31': 'ulsanCities',
  '36': 'sejongCities',
  '41': 'gyeonggiCities',
  '43': 'chungbukCities',
  '44': 'chungnamCities',
  '46': 'jeonnamCities',
  '47': 'gyeongbukCities',
  '48': 'gyeongnamCities',
  '50': 'jejuCities',
  '51': 'gangwonCities',
  '52': 'jeonbukCities',
}

const toModuleName = (provinceCode) => provinceFileAliases[provinceCode] ?? `province${provinceCode}Cities`

const transformCoordinatePair = (value) => {
  if (!Array.isArray(value) || value.length < 2) {
    return value
  }

  if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
    return value
  }

  if (Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90) {
    return value
  }

  const [longitude, latitude] = proj4(EPSG_5179, EPSG_4326, [value[0], value[1]])
  return [Number(longitude.toFixed(6)), Number(latitude.toFixed(6)), ...value.slice(2)]
}

const transformCoordinates = (value) => {
  if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return transformCoordinatePair(value)
  }

  if (Array.isArray(value)) {
    return value.map(transformCoordinates)
  }

  return value
}

const normalizeFeature = (feature, properties) => ({
  type: 'Feature',
  properties,
  geometry: feature.geometry
    ? {
        ...feature.geometry,
        coordinates: transformCoordinates(feature.geometry.coordinates),
      }
    : null,
})

const createFeatureCollectionModule = (constName, comment, featureCollection) => {
  return `import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'\n\n// ${comment}\nconst ${constName}: FeatureCollection<Geometry, GeoJsonProperties> = ${JSON.stringify(featureCollection, null, 2)}\n\nexport default ${constName}\n`
}

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url.toString()}`)
  }
  return response.json()
}

const fetchSgisToken = async () => {
  const authUrl = new URL(SGIS_AUTH_PATH, SGIS_API_BASE_URL)
  authUrl.searchParams.set('consumer_key', SGIS_SERVICE_ID)
  authUrl.searchParams.set('consumer_secret', SGIS_SECURITY_KEY)
  const authPayload = await fetchJson(authUrl)
  if (!authPayload?.result?.accessToken) {
    throw new Error('SGIS auth token missing')
  }
  return authPayload.result.accessToken
}

const fetchBoundaryCollection = async (accessToken, params = {}) => {
  const url = new URL(SGIS_BOUNDARY_PATH, SGIS_API_BASE_URL)
  url.searchParams.set('accessToken', accessToken)
  url.searchParams.set('year', SGIS_BOUNDARY_YEAR)
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })
  return fetchJson(url)
}

const main = async () => {
  fs.mkdirSync(path.dirname(PROVINCES_OUTPUT_PATH), { recursive: true })
  fs.mkdirSync(CITIES_OUTPUT_DIR, { recursive: true })

  const accessToken = await fetchSgisToken()
  const provincePayload = await fetchBoundaryCollection(accessToken)
  const provinceFeatures = (provincePayload.features ?? []).map((feature) => {
    const rawName = String(feature.properties?.adm_nm ?? '').trim()
    const province = provinceByName.get(rawName)
    return normalizeFeature(feature, {
      adm_cd: province?.provinceCode ?? String(feature.properties?.adm_cd ?? '').trim(),
      adm_nm: province?.name ?? rawName,
    })
  })

  const provinceCollection = {
    type: 'FeatureCollection',
    features: provinceFeatures,
  }

  fs.writeFileSync(
    PROVINCES_OUTPUT_PATH,
    createFeatureCollectionModule(
      'koreaProvinces',
      `Generated from SGIS hadmarea.geojson for province boundaries (${SGIS_BOUNDARY_YEAR}).`,
      provinceCollection,
    ),
  )

  const rawProvinceCodeByOfficialCode = new Map()
  ;(provincePayload.features ?? []).forEach((feature) => {
    const rawName = String(feature.properties?.adm_nm ?? '').trim()
    const rawCode = String(feature.properties?.adm_cd ?? '').trim()
    const province = provinceByName.get(rawName)
    if (province) {
      rawProvinceCodeByOfficialCode.set(province.provinceCode, rawCode)
    }
  })

  for (const province of provinces) {
    const rawProvinceCode = rawProvinceCodeByOfficialCode.get(province.provinceCode)
    if (!rawProvinceCode) {
      console.warn(`Skipping ${province.name}: SGIS province code not resolved`)
      continue
    }

    const cityPayload = await fetchBoundaryCollection(accessToken, {
      adm_cd: rawProvinceCode,
      low_search: '1',
    })

    const cityFeatures = (cityPayload.features ?? []).map((feature) => {
      const rawName = String(feature.properties?.adm_nm ?? '').trim()
      const city = cityByFullName.get(rawName)
      return normalizeFeature(feature, {
        adm_cd: city?.cityCode ?? String(feature.properties?.adm_cd ?? '').trim(),
        adm_nm: city?.name ?? rawName,
        parentCode: province.provinceCode,
      })
    })

    const collection = {
      type: 'FeatureCollection',
      features: cityFeatures,
    }

    const moduleName = toModuleName(province.provinceCode)
    fs.writeFileSync(
      path.join(CITIES_OUTPUT_DIR, `${moduleName}.ts`),
      createFeatureCollectionModule(
        moduleName,
        `Generated from SGIS hadmarea.geojson for ${province.name} city boundaries (${SGIS_BOUNDARY_YEAR}).`,
        collection,
      ),
    )
  }

  console.log(
    JSON.stringify(
      {
        provinceFeatures: provinceFeatures.length,
        cityModules: provinces.length,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
