import { getCityCatalog } from '@/services/adminService'
import type {
  BoundaryFeature,
  BoundaryFeatureCollection,
  CityDistrict,
  ProvinceCode,
} from '@/types/admin'
import { getProvinceCatalog } from '@/services/adminService'

const provinceCenterByCode = new Map(
  getProvinceCatalog().map((province) => [province.code, province.center]),
)

const getSyntheticBounds = (
  provinceCode: ProvinceCode,
  featureIndex: number,
  featureCount: number,
): [number, number, number, number] => {
  const [latitude, longitude] = provinceCenterByCode.get(provinceCode) ?? [36.2, 127.8]
  const columnCount = Math.max(3, Math.ceil(Math.sqrt(featureCount)))
  const rowIndex = Math.floor(featureIndex / columnCount)
  const columnIndex = featureIndex % columnCount
  const columnOffset = (columnIndex - (columnCount - 1) / 2) * 0.085
  const rowOffset = (rowIndex - (Math.ceil(featureCount / columnCount) - 1) / 2) * 0.075
  const halfWidth = 0.03
  const halfHeight = 0.024
  const centerLongitude = longitude + columnOffset
  const centerLatitude = latitude + rowOffset

  return [
    centerLongitude - halfWidth,
    centerLatitude - halfHeight,
    centerLongitude + halfWidth,
    centerLatitude + halfHeight,
  ]
}

const createCityFeature = (
  provinceCode: ProvinceCode,
  city: CityDistrict,
  featureIndex: number,
  featureCount: number,
): BoundaryFeature => {
  const [west, south, east, north] = getSyntheticBounds(provinceCode, featureIndex, featureCount)

  return {
    type: 'Feature',
    properties: {
      code: city.code,
      adminCode: city.code,
      name: city.name,
      parentCode: provinceCode,
      level: 'city',
      adminLevel: 'city',
      geometryType: 'Polygon',
      sourceType: 'snapshot',
      sourceDate: '2026-01-01',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  }
}

export const getGeneratedCityBoundaryCollection = (
  provinceCode: ProvinceCode,
): BoundaryFeatureCollection | null => {
  const cities = getCityCatalog().filter((city) => city.provinceCode === provinceCode)

  if (cities.length === 0) {
    return null
  }

  return {
    type: 'FeatureCollection',
    metadata: {
      adminLevel: 'city',
      featureCount: cities.length,
      geometryType: 'Polygon',
      sourceType: 'snapshot',
      sourceDate: '2026-01-01',
    },
    features: cities.map((city, index) =>
      createCityFeature(provinceCode, city, index, cities.length),
    ),
  }
}
