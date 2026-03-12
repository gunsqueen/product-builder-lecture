import type {
  BoundaryCollection,
  District,
  DistrictPopulationStats,
  Dong,
  DongPopulationStats,
  ElectionResult,
} from '../types';

export function getDistrictByCode(items: District[], districtCode?: string): District | undefined {
  return items.find((item) => item.districtCode === districtCode);
}

export function getDongByCode(items: Dong[], dongCode?: string): Dong | undefined {
  return items.find((item) => item.dongCode === dongCode);
}

export function getDistrictPopulationByCode(
  items: DistrictPopulationStats[],
  districtCode?: string,
): DistrictPopulationStats | undefined {
  return items.find((item) => item.districtCode === districtCode);
}

export function getDongPopulationByCode(items: DongPopulationStats[], dongCode?: string): DongPopulationStats | undefined {
  return items.find((item) => item.dongCode === dongCode);
}

export function getDongsByDistrict(items: Dong[], districtCode?: string): Dong[] {
  return items.filter((item) => item.districtCode === districtCode);
}

export function getDongPopulationByDistrict(items: DongPopulationStats[], districtCode?: string): DongPopulationStats[] {
  return items.filter((item) => item.districtCode === districtCode);
}

export function getElectionResultsForScope(
  items: ElectionResult[],
  scopeCode?: string,
  scopeLevel?: ElectionResult['scopeLevel'],
): ElectionResult[] {
  return items.filter((item) => item.scopeCode === scopeCode && item.scopeLevel === scopeLevel);
}

export function filterGeoFeaturesByDistrict(geojson: BoundaryCollection, districtCode?: string): BoundaryCollection {
  return {
    ...geojson,
    features: geojson.features.filter((feature) => feature.properties.districtCode === districtCode),
  };
}
