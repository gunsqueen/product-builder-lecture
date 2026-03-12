import type { ElectionResult } from '../types';
import { normalizeRegionCode, normalizeRegionName } from './normalizeRegionCode';

export function normalizeElectionRegionCode(result: ElectionResult): string {
  return normalizeRegionCode(result.scopeCode, result.scopeLevel === 'city' ? 'district' : result.scopeLevel);
}

export function buildElectionScopeKey(scopeLevel: ElectionResult['scopeLevel'], scopeCode: string): string {
  return `${scopeLevel}:${normalizeRegionCode(scopeCode, scopeLevel === 'city' ? 'district' : scopeLevel)}`;
}

export function electionNameMatches(left: string | undefined, right: string | undefined): boolean {
  return normalizeRegionName(left) === normalizeRegionName(right);
}
