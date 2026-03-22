import { getTownCatalog } from '@/services/adminService'
import { normalizeBoundaryCollection } from '@/utils/boundaryNormalizer'
import type {
  BoundaryFeatureCollection,
  BoundaryLoaderRegistry,
  CityCode,
} from '@/types/admin'

const TOWN_BOUNDARY_SOURCE_DATE = '2026-01-01'

const townBoundarySnapshotLoaders: BoundaryLoaderRegistry<CityCode> = {
  '11110': () => import('@/data/geo/towns/seoulJongnoTowns'),
}

export const loadTownBoundarySnapshot = async (
  cityCode: CityCode,
): Promise<BoundaryFeatureCollection | null> => {
  const loader = townBoundarySnapshotLoaders[cityCode]

  if (!loader) {
    return null
  }

  const rawCollection = (await loader()).default
  const normalizedCollection = normalizeBoundaryCollection(rawCollection, {
    adminLevel: 'town',
    parentCode: cityCode,
    sourceType: 'snapshot',
    sourceDate: TOWN_BOUNDARY_SOURCE_DATE,
    geometrySource: 'snapshot-file',
  })

  const expectedTownCount = getTownCatalog().filter((town) => town.cityCode === cityCode).length
  return normalizedCollection.features.length >= expectedTownCount
    ? normalizedCollection
    : null
}

export const getTownBoundarySnapshotLoaderRegistry = () =>
  townBoundarySnapshotLoaders

export const getTownBoundarySnapshotSourceDate = () => TOWN_BOUNDARY_SOURCE_DATE
