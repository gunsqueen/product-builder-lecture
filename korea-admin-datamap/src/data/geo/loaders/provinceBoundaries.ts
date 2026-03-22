import { loadProvinceBoundarySnapshot } from '@/data/snapshot/boundaries'
import type { BoundaryFeatureCollection } from '@/types/admin'

export const loadProvinceBoundaryCollection = async (): Promise<BoundaryFeatureCollection> =>
  loadProvinceBoundarySnapshot()
