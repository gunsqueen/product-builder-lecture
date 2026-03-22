import dissolve from '@turf/dissolve'
import { featureCollection } from '@turf/helpers'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'
import { getAllProvinces, getCityByCode, getProvinceByCode, getTownByCode } from './adminLookup'
import type { AdminLevel, BoundaryCollection, BoundaryFeature } from '../types/admin'

type RawBoundaryProperties = {
  adm_cd?: string
  adm_cd2?: string
  adm_nm?: string
  sgg?: string
  sggnm?: string
  sido?: string
  sidonm?: string
}

type RawBoundaryCollection = FeatureCollection<Geometry, RawBoundaryProperties>

const toShortName = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  return parts.at(-1) ?? name
}

type PolygonFeature = Feature<Polygon, { group: string }>

const toPolygonFeatures = (feature: BoundaryFeature, group: string): PolygonFeature[] => {
  if (!feature.geometry) return []
  if (feature.geometry.type === 'Polygon') {
    return [
      {
        type: 'Feature',
        geometry: feature.geometry,
        properties: { group },
      },
    ]
  }
  if (feature.geometry.type === 'MultiPolygon') {
    return feature.geometry.coordinates.map((coordinates) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates,
      },
      properties: { group },
    }))
  }
  return []
}

const toMultiPolygonCoordinates = (geometry: Polygon | MultiPolygon) => {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates]
  }
  return geometry.coordinates
}

export const normalizeTownBoundaryCollection = (raw: RawBoundaryCollection): BoundaryCollection => {
  const features: BoundaryFeature[] = []
  let skipped = 0

  raw.features.forEach((feature) => {
    const props = feature.properties ?? {}
    const townCode = String(props.adm_cd2 ?? '').trim()
    const cityCode = String(props.sgg ?? '').trim()
    const provinceCode = String(props.sido ?? '').trim()
    const fullName = String(props.adm_nm ?? '').trim()

    if (!feature.geometry || !townCode || !cityCode || !provinceCode || !fullName) {
      skipped += 1
      if (import.meta.env.DEV) {
        console.warn('[boundary:skip]', {
          reason: 'missing_required_property',
          properties: props,
          hasGeometry: Boolean(feature.geometry),
        })
      }
      return
    }

    const town = getTownByCode(townCode)
    const geometryType = feature.geometry.type
    if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
      skipped += 1
      if (import.meta.env.DEV) {
        console.warn('[boundary:skip]', {
          reason: 'unsupported_geometry',
          townCode,
          geometryType,
          fullName,
        })
      }
      return
    }

    features.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        adminCode: townCode,
        name: town?.name ?? toShortName(fullName),
        level: 'town',
        parentCode: cityCode,
        provinceCode,
        cityCode,
        fullName,
      },
    })
  })

  if (import.meta.env.DEV) {
    console.log('[boundary:normalize]', {
      featureTotalCount: raw.features.length,
      townFeatureCount: features.length,
      skippedCount: skipped,
      firstFeatureSample: features[0]?.properties ?? null,
    })
  }

  return { type: 'FeatureCollection', features }
}

const aggregateBoundaries = (
  towns: BoundaryFeature[],
  level: Exclude<AdminLevel, 'town'>,
  filterCode?: string,
): BoundaryCollection => {
  const groups = new Map<string, BoundaryFeature[]>()

  towns.forEach((feature) => {
    const provinceCode = feature.properties.provinceCode
    const cityCode = feature.properties.cityCode ?? feature.properties.parentCode
    if (!provinceCode || !cityCode) {
      if (import.meta.env.DEV) {
        console.warn('[boundary:aggregate:skip]', {
          reason: 'missing_parent_codes',
          level,
          adminCode: feature.properties.adminCode,
          name: feature.properties.name,
          provinceCode,
          cityCode,
        })
      }
      return
    }
    const key = level === 'province' ? provinceCode : cityCode
    const parentMatches = level === 'city' ? provinceCode === filterCode : true
    if (!parentMatches) return
    const bucket = groups.get(key)
    if (bucket) bucket.push(feature)
    else groups.set(key, [feature])
  })

  const features: BoundaryFeature[] = []

  groups.forEach((items, key) => {
    const polygonFeatures = items.flatMap((item) => toPolygonFeatures(item, key))
    if (polygonFeatures.length === 0) return

    const dissolved = dissolve(featureCollection(polygonFeatures))
    const dissolvedFeatures = dissolved.features
    if (dissolvedFeatures.length === 0) return
    const coordinates = dissolvedFeatures.flatMap((item) =>
      toMultiPolygonCoordinates(item.geometry as Polygon | MultiPolygon),
    )
    if (coordinates.length === 0) return

    const province = getProvinceByCode(key)
    const city = getCityByCode(key)
    const fullName =
      level === 'province'
        ? province?.name ?? items[0].properties.fullName?.split(' ')[0] ?? key
        : city?.name
          ? `${getProvinceByCode(city.provinceCode)?.name ?? ''} ${city.name}`.trim()
          : items[0].properties.fullName?.split(' ').slice(0, 2).join(' ') ?? key

    features.push({
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates,
      },
      properties: {
        adminCode: key,
        name: level === 'province' ? province?.name ?? toShortName(fullName) : city?.name ?? toShortName(fullName),
        level,
        parentCode: level === 'city' ? filterCode : undefined,
        provinceCode: level === 'province' ? key : filterCode,
        cityCode: level === 'city' ? key : undefined,
        fullName,
      },
    })
  })

  if (import.meta.env.DEV) {
    const outputCodes = features.map((feature) => feature.properties.adminCode).sort()
    const missingProvinceCodes =
      level === 'province'
        ? getAllProvinces()
            .map((province) => province.adminCode)
            .filter((code) => !outputCodes.includes(code))
        : []
    console.log('[boundary:aggregate]', {
      level,
      filterCode: filterCode ?? null,
      inputTownCount: towns.length,
      outputFeatureCount: features.length,
      outputCodeList: outputCodes,
      missingProvinceCodes,
      sourceFeatureCounts: Object.fromEntries(
        [...groups.entries()].map(([groupCode, groupItems]) => [groupCode, groupItems.length]),
      ),
      geometryTypeSummary: features.map((feature) => ({
        adminCode: feature.properties.adminCode,
        geometryType: feature.geometry.type,
      })),
      firstFeatureSample: features[0]?.properties ?? null,
    })
  }

  return { type: 'FeatureCollection', features }
}

export const aggregateProvinceBoundaries = (towns: BoundaryFeature[]) => aggregateBoundaries(towns, 'province')

export const aggregateCityBoundaries = (towns: BoundaryFeature[], provinceCode: string) =>
  aggregateBoundaries(towns, 'city', provinceCode)
