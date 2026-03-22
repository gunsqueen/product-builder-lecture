import { APP_CONFIG } from '@/config/app'
import { normalizeBoundaryCollection } from '@/utils/boundaryNormalizer'
import { getCityCatalog } from '@/services/adminService'
import type {
  BoundaryFeatureCollection,
  BoundaryLoaderRegistry,
  ProvinceCode,
} from '@/types/admin'

const CITY_BOUNDARY_SOURCE_DATE = '2026-01-01'

const cityBoundarySnapshotLoaders: BoundaryLoaderRegistry<ProvinceCode> = {
  '11': () => import('@/data/geo/cities/seoulCities'),
  '26': () => import('@/data/geo/cities/busanCities'),
  '27': () => import('@/data/geo/cities/daeguCities'),
  '28': () => import('@/data/geo/cities/incheonCities'),
  '29': () => import('@/data/geo/cities/gwangjuCities'),
  '30': () => import('@/data/geo/cities/daejeonCities'),
  '31': () => import('@/data/geo/cities/ulsanCities'),
  '36': () => import('@/data/geo/cities/sejongCities'),
  '41': () => import('@/data/geo/cities/gyeonggiCities'),
  '43': () => import('@/data/geo/cities/chungbukCities'),
  '44': () => import('@/data/geo/cities/chungnamCities'),
  '46': () => import('@/data/geo/cities/jeonnamCities'),
  '47': () => import('@/data/geo/cities/gyeongbukCities'),
  '48': () => import('@/data/geo/cities/gyeongnamCities'),
  '50': () => import('@/data/geo/cities/jejuCities'),
  '51': () => import('@/data/geo/cities/gangwonCities'),
  '52': () => import('@/data/geo/cities/jeonbukCities'),
}

export const loadCityBoundarySnapshot = async (
  provinceCode: ProvinceCode,
): Promise<BoundaryFeatureCollection | null> => {
  const loader = cityBoundarySnapshotLoaders[provinceCode]
  const expectedCityCount = getCityCatalog().filter((city) => city.provinceCode === provinceCode).length

  if (loader) {
    const rawCollection = (await loader()).default
    const normalizedCollection = normalizeBoundaryCollection(rawCollection, {
      adminLevel: 'city',
      parentCode: provinceCode,
      sourceType: 'snapshot',
      sourceDate: CITY_BOUNDARY_SOURCE_DATE,
      geometrySource: 'snapshot-file',
    })

    if (normalizedCollection.features.length >= expectedCityCount) {
      return normalizedCollection
    }
  }

  if (!APP_CONFIG.enableGeneratedBoundaryFallback) {
    return null
  }

  const { getGeneratedCityBoundaryCollection } = await import(
    '@/data/geo/cities/generatedProvinceCities'
  )
  const generatedCollection = getGeneratedCityBoundaryCollection(provinceCode)

  if (!generatedCollection) {
    return null
  }

  return normalizeBoundaryCollection(generatedCollection, {
    adminLevel: 'city',
    parentCode: provinceCode,
    sourceType: 'snapshot',
    sourceDate: CITY_BOUNDARY_SOURCE_DATE,
    geometrySource: 'generated-grid',
  })
}

export const getCityBoundarySnapshotLoaderRegistry = () =>
  cityBoundarySnapshotLoaders

export const getCityBoundarySnapshotSourceDate = () => CITY_BOUNDARY_SOURCE_DATE
