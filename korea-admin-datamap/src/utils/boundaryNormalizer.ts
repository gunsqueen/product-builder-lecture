import proj4 from 'proj4'
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import type {
  AdminCode,
  AdminLevel,
  BoundaryFeature,
  BoundaryFeatureCollection,
  BoundaryGeometrySource,
  BoundaryLoadResult,
  BoundaryParentCode,
  BoundarySourceType,
} from '@/types/admin'
import { getAdminLevelFromCode, getParentAdminCode } from '@/utils/adminCode'

interface NormalizeBoundaryCollectionOptions {
  adminLevel?: AdminLevel
  parentCode?: BoundaryParentCode
  sourceType: BoundarySourceType
  sourceDate: string
  geometrySource?: BoundaryGeometrySource
}

type RawBoundaryProperties = GeoJsonProperties & {
  code?: string
  adminCode?: string
  adm_cd?: string
  admCode?: string
  name?: string
  adm_nm?: string
  level?: string
  adminLevel?: string
  parentCode?: string
}

const EPSG_5179 = 'EPSG:5179'
const EPSG_4326 = 'EPSG:4326'

proj4.defs(
  EPSG_5179,
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
)

const toBoundaryCode = (properties: RawBoundaryProperties, featureId?: string) => {
  const value =
    properties.adminCode ??
    properties.adm_cd ??
    properties.admCode ??
    properties.code ??
    featureId ??
    ''
  return String(value).trim()
}

const toBoundaryName = (properties: RawBoundaryProperties, code: string) =>
  String(properties.name ?? properties.adm_nm ?? code).trim()

const toBoundaryLevel = (
  code: AdminCode,
  properties: RawBoundaryProperties,
  adminLevel?: AdminLevel,
): AdminLevel => {
  if (adminLevel) {
    return adminLevel
  }

  if (
    properties.adminLevel === 'province' ||
    properties.adminLevel === 'city' ||
    properties.adminLevel === 'town'
  ) {
    return properties.adminLevel
  }

  if (
    properties.level === 'province' ||
    properties.level === 'city' ||
    properties.level === 'town'
  ) {
    return properties.level
  }

  return getAdminLevelFromCode(code)
}

const toParentCode = (
  code: AdminCode,
  adminLevel: AdminLevel,
  properties: RawBoundaryProperties,
  parentCode?: BoundaryParentCode,
) => {
  if (adminLevel === 'province') {
    return undefined
  }

  if (parentCode) {
    return parentCode
  }

  if (properties.parentCode) {
    return properties.parentCode as BoundaryParentCode
  }

  const inferredParentCode = getParentAdminCode(code)
  return inferredParentCode
    ? (inferredParentCode as BoundaryParentCode)
    : undefined
}

const getCollectionGeometryType = (
  features: BoundaryFeature[],
): Geometry['type'] | 'mixed' | 'unknown' => {
  const geometryTypes = [...new Set(features.map((feature) => feature.geometry.type))]

  if (geometryTypes.length === 0) {
    return 'unknown'
  }

  if (geometryTypes.length === 1) {
    return geometryTypes[0]
  }

  return 'mixed'
}

const isCoordinatePair = (value: unknown): value is [number, number, ...number[]] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number'

const transformCoordinatePair = (value: [number, number, ...number[]]) => {
  if (Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90) {
    return value
  }

  const [longitude, latitude] = proj4(EPSG_5179, EPSG_4326, [value[0], value[1]])
  return [longitude, latitude, ...value.slice(2)]
}

const transformGeometryCoordinates = (value: unknown): unknown => {
  if (isCoordinatePair(value)) {
    return transformCoordinatePair(value)
  }

  if (Array.isArray(value)) {
    return value.map(transformGeometryCoordinates)
  }

  return value
}

const normalizeGeometry = (geometry: Geometry): Geometry => {
  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: geometry.geometries.map(normalizeGeometry),
    }
  }

  if (!('coordinates' in geometry)) {
    return geometry
  }

  return {
    ...geometry,
    coordinates: transformGeometryCoordinates(geometry.coordinates),
  } as Geometry
}

export const normalizeBoundaryCollection = (
  collection: FeatureCollection<Geometry, GeoJsonProperties>,
  options: NormalizeBoundaryCollectionOptions,
): BoundaryFeatureCollection => {
  const normalizedFeatures: Array<BoundaryFeature | null> = collection.features.map(
    (feature) => {
      const rawProperties = (feature.properties ?? {}) as RawBoundaryProperties
      const code = toBoundaryCode(rawProperties, String(feature.id ?? ''))

      if (!code || !feature.geometry?.type) {
        return null
      }

      const adminCode = code as AdminCode
      const adminLevel = toBoundaryLevel(adminCode, rawProperties, options.adminLevel)
      const parentCode = toParentCode(
        adminCode,
        adminLevel,
        rawProperties,
        options.parentCode,
      )
      const properties = {
        code: adminCode,
        adminCode,
        name: toBoundaryName(rawProperties, code),
        level: adminLevel,
        adminLevel,
        ...(parentCode ? { parentCode } : {}),
        geometryType: feature.geometry.type,
        sourceType: options.sourceType,
        sourceDate: options.sourceDate,
      } satisfies BoundaryFeature['properties']

      return {
        ...feature,
        geometry: normalizeGeometry(feature.geometry),
        properties,
      }
    },
  )
  const features = normalizedFeatures.filter(
    (feature): feature is BoundaryFeature => feature !== null,
  )

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      adminLevel:
        options.adminLevel ??
        features[0]?.properties.adminLevel ??
        'province',
      featureCount: features.length,
      geometryType: getCollectionGeometryType(features),
      sourceType: options.sourceType,
      sourceDate: options.sourceDate,
      geometrySource: options.geometrySource,
    },
  }
}

export const createBoundaryLoadResult = (
  collection: BoundaryFeatureCollection | null,
  options: NormalizeBoundaryCollectionOptions,
): BoundaryLoadResult => ({
  collection,
  adminLevel:
    options.adminLevel ??
    collection?.metadata?.adminLevel ??
    collection?.features[0]?.properties.adminLevel ??
    'province',
  featureCount: collection?.features.length ?? 0,
  geometryType:
    collection?.metadata?.geometryType ??
    collection?.features[0]?.properties.geometryType ??
    'unknown',
  sourceType: collection?.metadata?.sourceType ?? options.sourceType,
  sourceDate: collection?.metadata?.sourceDate ?? options.sourceDate,
  geometrySource: collection?.metadata?.geometrySource ?? options.geometrySource,
})

export const getBoundaryCodes = (collection: BoundaryFeatureCollection | null) =>
  collection?.features.map((feature) => feature.properties.adminCode) ?? []
