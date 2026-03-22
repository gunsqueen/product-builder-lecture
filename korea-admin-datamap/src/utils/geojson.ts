import type { BoundaryFeatureCollection } from '@/types/admin'

export const featureCollectionHasData = (
  featureCollection: BoundaryFeatureCollection | null,
) => Boolean(featureCollection && featureCollection.features.length > 0)

export const getFeatureCodes = (featureCollection: BoundaryFeatureCollection) =>
  featureCollection.features.map((feature) => feature.properties.adminCode)
