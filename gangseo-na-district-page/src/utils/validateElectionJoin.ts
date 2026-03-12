import type { AreaLevel, ElectionJoinResult, ElectionResult } from '../types';
import { normalizeRegionCode } from './normalizeRegionCode';

export function validateElectionJoin(
  regionCodes: string[],
  electionItems: ElectionResult[],
  level: AreaLevel,
  scopeLabel: string,
): ElectionJoinResult {
  const normalizedRegionCodes = new Set(regionCodes.map((code) => normalizeRegionCode(code, level)).filter(Boolean));
  const normalizedElectionCodes = new Set(
    electionItems.map((item) => normalizeRegionCode(item.scopeCode, level)).filter(Boolean),
  );

  const unmatchedRegionCodes = [...normalizedRegionCodes].filter((code) => !normalizedElectionCodes.has(code));
  const unmatchedElectionCodes = [...normalizedElectionCodes].filter((code) => !normalizedRegionCodes.has(code));
  const matchedCount = [...normalizedRegionCodes].filter((code) => normalizedElectionCodes.has(code)).length;

  const result: ElectionJoinResult = {
    scopeLabel,
    level,
    matchedCount,
    regionCount: normalizedRegionCodes.size,
    unmatchedRegionCodes,
    unmatchedElectionCodes,
  };

  const summary = `${scopeLabel}: ${matchedCount}/${normalizedRegionCodes.size} matched`;
  if (unmatchedRegionCodes.length || unmatchedElectionCodes.length) {
    console.warn(`[validateElectionJoin] ${summary}`, result);
  } else {
    console.info(`[validateElectionJoin] ${summary}`);
  }

  return result;
}
