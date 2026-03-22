import {
  getCityBoundarySnapshotLoaderRegistry,
  loadCityBoundarySnapshot,
} from '@/data/snapshot/boundaries'
import type { BoundaryFeatureCollection, ProvinceCode } from '@/types/admin'

export const loadCityBoundaryCollection = async (
  provinceCode: ProvinceCode,
): Promise<BoundaryFeatureCollection | null> => {
  return loadCityBoundarySnapshot(provinceCode)
}

export const getCityBoundaryLoaderRegistry = () =>
  getCityBoundarySnapshotLoaderRegistry()
