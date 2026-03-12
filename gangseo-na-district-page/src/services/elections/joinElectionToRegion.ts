import type { AreaLevel, ElectionResult } from '../../types';
import { normalizeRegionCode } from '../../utils/normalizeRegionCode';

export function joinElectionToRegion(
  regionCodes: string[],
  electionResults: ElectionResult[],
  level: AreaLevel,
): Map<string, ElectionResult> {
  const regionSet = new Set(regionCodes.map((code) => normalizeRegionCode(code, level)).filter(Boolean));
  return new Map(
    electionResults
      .map((item) => [normalizeRegionCode(item.scopeCode, level), item] as const)
      .filter(([code]) => regionSet.has(code)),
  );
}
