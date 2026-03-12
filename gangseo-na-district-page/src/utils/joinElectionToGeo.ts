import { normalizeRegionCode } from './normalizeRegionCode';
import type { AreaLevel, ElectionResult, JoinedBoundaryFeature } from '../types';

export function joinElectionToGeo(
  items: JoinedBoundaryFeature[],
  electionResults: ElectionResult[],
  level: AreaLevel,
): JoinedBoundaryFeature[] {
  const lookup = new Map(
    electionResults.map((item) => [normalizeRegionCode(item.scopeCode, level), item]),
  );

  return items.map((item) => {
    const code = level === 'district'
      ? normalizeRegionCode(item.feature.properties.districtCode, 'district')
      : normalizeRegionCode(item.feature.properties.dongCode, 'dong');

    return {
      ...item,
      election: lookup.get(code),
    };
  });
}
