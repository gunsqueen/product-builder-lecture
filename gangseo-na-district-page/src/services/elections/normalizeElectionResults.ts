import type { ElectionDataset, ElectionEntry, ElectionResult, ElectionSummary } from '../../types';

interface RawElectionEntry {
  label?: string;
  party?: string;
  value?: number | string;
  share?: number | string;
  color?: string;
}

interface RawElectionResult {
  electionId?: string;
  electionName?: string;
  electionType?: ElectionResult['electionType'];
  electionYear?: number | string;
  resultMode?: ElectionResult['resultMode'];
  scopeLevel?: ElectionResult['scopeLevel'];
  scopeCode?: string;
  scopeName?: string;
  districtCode?: string;
  districtName?: string;
  dongCode?: string;
  dongName?: string;
  constituencyName?: string;
  turnout?: number | string;
  totalVotes?: number | string;
  totalElectors?: number | string;
  updatedAt?: string;
  source?: string;
  results?: RawElectionEntry[];
}

interface RawElectionDataset {
  updatedAt?: string;
  source?: string;
  items?: RawElectionResult[];
}

export function normalizeElectionDataset(raw: RawElectionDataset): ElectionDataset {
  return {
    items: (raw.items ?? [])
      .map((item) => normalizeElectionResult(item, raw))
      .filter((item): item is ElectionResult => Boolean(item))
      .sort(compareElectionResult),
    meta: {
      requestedAt: new Date().toISOString(),
      dataUpdatedAt: raw.updatedAt,
      sourceLabel: raw.source ?? '선거 결과 JSON',
      resolvedSource: 'real',
      fallbackUsed: false,
    },
  };
}

export function normalizeElectionResult(raw: RawElectionResult, dataset?: RawElectionDataset): ElectionResult | undefined {
  if (!raw.electionId || !raw.electionName || !raw.electionType || !raw.resultMode || !raw.scopeLevel || !raw.scopeCode || !raw.scopeName) {
    return undefined;
  }

  const results = (raw.results ?? [])
    .map(normalizeElectionEntry)
    .filter((item): item is ElectionEntry => Boolean(item))
    .sort((left, right) => right.share - left.share || right.value - left.value);

  return {
    electionId: raw.electionId,
    electionName: raw.electionName,
    electionType: raw.electionType,
    electionYear: Number(raw.electionYear) || Number(`${raw.updatedAt ?? dataset?.updatedAt ?? ''}`.slice(0, 4)) || new Date().getFullYear(),
    resultMode: raw.resultMode,
    scopeLevel: raw.scopeLevel,
    scopeCode: `${raw.scopeCode}`,
    scopeName: raw.scopeName,
    districtCode: raw.districtCode ? `${raw.districtCode}` : undefined,
    districtName: raw.districtName,
    dongCode: raw.dongCode ? `${raw.dongCode}` : undefined,
    dongName: raw.dongName,
    constituencyName: raw.constituencyName,
    turnout: Number(raw.turnout) || 0,
    totalVotes: Number(raw.totalVotes) || 0,
    totalElectors: raw.totalElectors === undefined ? undefined : Number(raw.totalElectors),
    updatedAt: raw.updatedAt ?? dataset?.updatedAt ?? '',
    source: raw.source ?? dataset?.source ?? '선거 결과 JSON',
    results,
  };
}

export function buildElectionSummary(result?: ElectionResult): ElectionSummary | undefined {
  if (!result) {
    return undefined;
  }

  return {
    winnerLabel: result.results[0]?.label,
    winnerParty: result.results[0]?.party,
    turnout: result.turnout,
    totalVotes: result.totalVotes,
    totalElectors: result.totalElectors,
  };
}

function normalizeElectionEntry(raw: RawElectionEntry): ElectionEntry | undefined {
  if (!raw.label) {
    return undefined;
  }

  return {
    label: raw.label,
    party: raw.party,
    value: Number(raw.value) || 0,
    share: Number(raw.share) || 0,
    color: raw.color,
  };
}

function compareElectionResult(left: ElectionResult, right: ElectionResult): number {
  if (left.electionYear !== right.electionYear) {
    return right.electionYear - left.electionYear;
  }

  return left.electionName.localeCompare(right.electionName, 'ko');
}
