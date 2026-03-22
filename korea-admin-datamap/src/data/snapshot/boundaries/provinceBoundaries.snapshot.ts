import { normalizeBoundaryCollection } from '@/utils/boundaryNormalizer'
import type { BoundaryFeatureCollection } from '@/types/admin'

const PROVINCE_BOUNDARY_SOURCE_DATE = '2026-01-01'

export const loadProvinceBoundarySnapshot = async (): Promise<BoundaryFeatureCollection> => {
  const rawCollection = (await import('@/data/geo/provinces/koreaProvinces')).default

  return normalizeBoundaryCollection(rawCollection, {
    adminLevel: 'province',
    sourceType: 'snapshot',
    sourceDate: PROVINCE_BOUNDARY_SOURCE_DATE,
    geometrySource: 'snapshot-file',
  })
}

export const getProvinceBoundarySnapshotSourceDate = () =>
  PROVINCE_BOUNDARY_SOURCE_DATE
