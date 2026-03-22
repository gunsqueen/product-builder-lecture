import {
  getTownBoundarySnapshotLoaderRegistry,
  loadTownBoundarySnapshot,
} from '@/data/snapshot/boundaries'
import type { BoundaryFeatureCollection, CityCode } from '@/types/admin'

export const loadTownBoundaryCollection = async (
  cityCode: CityCode,
): Promise<BoundaryFeatureCollection | null> => {
  return loadTownBoundarySnapshot(cityCode)
}

export const getTownBoundaryLoaderRegistry = () =>
  getTownBoundarySnapshotLoaderRegistry()
