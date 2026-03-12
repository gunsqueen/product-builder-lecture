import { normalizeRegionCode } from './normalizeRegionCode';
import type { AreaLevel, BoundaryCollection, DistrictPopulationStats, DongPopulationStats, JoinedBoundaryFeature } from '../types';

export function joinPopulationToGeo(
  geojson: BoundaryCollection,
  populationItems: Array<DistrictPopulationStats | DongPopulationStats>,
  level: AreaLevel,
): JoinedBoundaryFeature[] {
  const lookup = new Map(
    populationItems.map((item) => {
      const code = level === 'district' ? normalizeRegionCode(item.districtCode, 'district') : normalizeRegionCode((item as DongPopulationStats).dongCode, 'dong');
      return [code, item];
    }),
  );

  return geojson.features.map((feature) => {
    const code = level === 'district'
      ? normalizeRegionCode(feature.properties.districtCode, 'district')
      : normalizeRegionCode(feature.properties.dongCode, 'dong');

    return {
      feature,
      population: lookup.get(code),
    };
  });
}
