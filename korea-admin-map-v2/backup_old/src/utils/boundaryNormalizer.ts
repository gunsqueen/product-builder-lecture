import proj4 from 'proj4'
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import type {
  BoundaryFeature,
  BoundaryFeatureCollection,
  AdminCode,
  AdminLevel,
} from '../types/admin'
import { getParentCode } from './adminCode'
import { buildNameAliases, normalizeAdminName } from './adminName'
import { getCitiesByProvince, getProvinces, getTownsByCity } from '../services/adminService'
import { isDev } from '../config/app'

proj4.defs(
  'EPSG:5179',
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
)

type RawProps = GeoJsonProperties & {
  adm_cd?: string
  adm_nm?: string
  code?: string
  adminCode?: string
  name?: string
}

const transformCoordinates = (value: unknown): unknown => {
  if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
    if (Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90) {
      return value
    }
    const [lng, lat] = proj4('EPSG:5179', 'EPSG:4326', [value[0], value[1]])
    return [lng, lat, ...value.slice(2)]
  }

  if (Array.isArray(value)) {
    return value.map(transformCoordinates)
  }

  return value
}

const normalizeGeometry = (geometry: Geometry): Geometry => {
  if (!('coordinates' in geometry)) {
    return geometry
  }
  return { ...geometry, coordinates: transformCoordinates(geometry.coordinates) as never }
}

const resolveTownCodeByName = (cityCode: string, name: string) => {
  const normalized = normalizeAdminName(name)
  const town = getTownsByCity(cityCode).find((item) =>
    buildNameAliases(item.name).some((alias) => {
      const candidate = normalizeAdminName(alias)
      return normalized === candidate || normalized.endsWith(candidate)
    }),
  )
  return town?.townCode
}

const resolveCityCodeByName = (provinceCode: string, name: string) => {
  const normalized = normalizeAdminName(name)
  const city = getCitiesByProvince(provinceCode).find((item) =>
    buildNameAliases(item.name).some((alias) => {
      const candidate = normalizeAdminName(alias)
      return normalized === candidate || normalized.endsWith(candidate)
    }),
  )
  return city?.cityCode
}

const resolveProvinceCodeByName = (name: string) => {
  const normalized = normalizeAdminName(name)
  const province = getProvinces().find((item) =>
    buildNameAliases(item.name).some((alias) => {
      const candidate = normalizeAdminName(alias)
      return normalized === candidate || normalized.endsWith(candidate)
    }),
  )
  return province?.provinceCode
}

const getOfficialCode = (
  rawCode: string,
  rawName: string,
  adminLevel: AdminLevel,
  parentCode?: string,
) => {
  if (adminLevel === 'province') {
    return rawCode.length === 2 ? rawCode : resolveProvinceCodeByName(rawName)
  }

  if (adminLevel === 'city') {
    if (rawCode.length === 5) return rawCode
    return parentCode ? resolveCityCodeByName(parentCode, rawName) : null
  }

  if (rawCode.length === 10) return rawCode
  return parentCode ? resolveTownCodeByName(parentCode, rawName) : null
}

export const normalizeBoundaryCollection = (
  collection: FeatureCollection<Geometry, GeoJsonProperties>,
  options: {
    adminLevel: AdminLevel
    parentCode?: string
    sourceType: 'real' | 'snapshot' | 'mock'
    sourceDate: string
  },
): BoundaryFeatureCollection => {
  const features = collection.features
    .map((feature) => {
      const props = (feature.properties ?? {}) as RawProps
      const rawCode = String(props.adminCode ?? props.adm_cd ?? props.code ?? '').trim()
      const rawName = String(props.name ?? props.adm_nm ?? '').trim()
      const geometry = feature.geometry

      if (!geometry) {
        if (isDev) console.warn('[boundary:skip]', { reason: 'missing_geometry', rawCode, rawName })
        return null
      }

      const officialCode = getOfficialCode(rawCode, rawName, options.adminLevel, options.parentCode)
      if (!officialCode) {
        if (isDev) console.warn('[boundary:skip]', { reason: 'unresolved_code', rawCode, rawName, level: options.adminLevel, parentCode: options.parentCode })
        return null
      }

      const normalized: BoundaryFeature = {
        type: 'Feature',
        geometry: normalizeGeometry(geometry),
        properties: {
          adminCode: officialCode as AdminCode,
          adminLevel: options.adminLevel,
          name: rawName || officialCode,
          parentCode: options.parentCode ?? getParentCode(officialCode),
          geometryType: geometry.type,
          sourceType: options.sourceType,
          sourceDate: options.sourceDate,
        },
      }

      return normalized
    })
    .filter((feature): feature is BoundaryFeature => Boolean(feature))

  if (isDev) {
    console.info('[boundary:normalize]', {
      level: options.adminLevel,
      parentCode: options.parentCode,
      inputFeatureCount: collection.features.length,
      outputFeatureCount: features.length,
      geometryTypes: [...new Set(features.map((feature) => feature.geometry.type))],
    })
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      sourceType: options.sourceType,
      sourceDate: options.sourceDate,
      adminLevel: options.adminLevel,
      featureCount: features.length,
      geometryTypes: [...new Set(features.map((feature) => feature.geometry.type))],
    },
  }
}
