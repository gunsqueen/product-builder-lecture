import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';
import XLSX from 'xlsx';

type ScopeLevel = 'city' | 'district' | 'dong';
type ResultMode = 'candidate' | 'party';
type ElectionType = 'presidential' | 'assembly' | 'local' | 'mayoral';

interface ElectionEntry {
  label: string;
  party?: string;
  value: number;
  share: number;
  color?: string;
}

interface ElectionItem {
  electionId: string;
  electionName: string;
  electionType: ElectionType;
  electionYear: number;
  resultMode: ResultMode;
  scopeLevel: ScopeLevel;
  scopeCode: string;
  scopeName: string;
  districtCode?: string;
  districtName?: string;
  dongCode?: string;
  dongName?: string;
  constituencyName?: string;
  turnout: number;
  totalVotes: number;
  totalElectors?: number;
  updatedAt: string;
  source: string;
  results: ElectionEntry[];
}

interface ElectionDataset {
  updatedAt: string;
  source: string;
  items: ElectionItem[];
}

interface RegionMeta {
  districtCode: string;
  districtName: string;
  dongCode: string;
  dongName: string;
}

interface RunningAggregate {
  totalElectors: number;
  totalVotes: number;
  invalidVotes: number;
  results: Map<string, { party?: string; value: number }>;
}

interface LocalSheetConfig {
  sheetName: string;
  electionId: string;
  electionName: string;
  electionType: ElectionType;
  electionYear: number;
  resultMode: ResultMode;
  updatedAt: string;
  source: string;
  citywide: boolean;
  indexes: {
    city: number;
    district: number;
    dong: number;
    poll: number;
    electors: number;
    votes: number;
  };
}

interface LocalConstituencySheetConfig extends LocalSheetConfig {
  constituency: number;
}

/*
 * 입력 파일 예시
 * - raw/presidential_21.xlsx                  (제21대 대통령선거 통합 엑셀, NEC open-data file.do?dataId=8)
 * - raw/presidential_20.csv                   (공공데이터포털 15025528 주기성 과거데이터 20220309)
 * - raw/assembly_22.xlsx                      (제22대 국회의원선거 통합 엑셀)
 * - raw/local_8.xlsx                          (공공데이터포털 15101509, 제8회 전국동시지방선거 개표결과)
 *
 * 기대 시트 / 포맷 예시
 * - 대통령선거(2025): sheet1
 * - 대통령선거(2022): CSV, 컬럼 = 시도명 | 구시군명 | 읍면동명 | 투표구명 | 후보자 | 득표수
 * - 국회의원선거(2024): 지역구, 비례대표
 * - 제8회 지방선거(2022): 시·도지사, 구·시·군의장, 교육감
 *
 * 출력 파일 예시
 * - src/data/elections/seoulElectionResults.json
 */

const DEFAULT_PRESIDENTIAL_21_INPUT = path.resolve('raw/presidential_21.xlsx');
const DEFAULT_PRESIDENTIAL_20_INPUT = path.resolve('raw/presidential_20.csv');
const DEFAULT_ASSEMBLY_INPUT = path.resolve('raw/assembly_22.xlsx');
const DEFAULT_LOCAL_INPUT = path.resolve('raw/local_8.xlsx');
const DEFAULT_OUTPUT = path.resolve('src/data/elections/seoulElectionResults.json');
const DONGS_JSON = path.resolve('src/data/mock/seoulDongs.json');
const DISTRICTS_JSON = path.resolve('src/data/mock/seoulDistricts.json');

const SPECIAL_ROWS = new Set([
  '합계',
  '거소·선상투표',
  '거소투표',
  '관외사전투표',
  '국외부재자투표',
  '재외투표',
  '잘못 투입·구분된 투표지',
  '잘못투입·구분된투표지',
  '잘못 투입 구분된 투표지',
]);

const PARTY_COLORS: Record<string, string> = {
  더불어민주당: '#2563eb',
  더불어민주연합: '#2563eb',
  국민의힘: '#dc2626',
  국민의미래: '#dc2626',
  개혁신당: '#f97316',
  조국혁신당: '#0f172a',
  녹색정의당: '#16a34a',
  정의당: '#f59e0b',
  진보당: '#c2410c',
  새로운미래: '#0ea5e9',
  민주노동당: '#d97706',
  기본소득당: '#06b6d4',
  녹색당: '#16a34a',
  국가혁명당: '#a855f7',
  노동당: '#ef4444',
  새누리당: '#f97316',
  신자유민주연합: '#475569',
  우리공화당: '#7c3aed',
  통일한국당: '#64748b',
  한류연합당: '#14b8a6',
  무소속: '#6b7280',
};

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeName(value: string | undefined): string {
  return `${value ?? ''}`
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/제(\d+)/g, '$1')
    .replace(/[()·ㆍ]/g, '')
    .trim();
}

function parseNumber(value: unknown): number {
  const normalized = `${value ?? ''}`.replace(/,/g, '').trim();
  return normalized ? Number(normalized) : 0;
}

function sortResults(results: ElectionEntry[]): ElectionEntry[] {
  return [...results].sort((left, right) => right.share - left.share || right.value - left.value);
}

function createEntries(
  rawValues: Array<{ label: string; party?: string; value: number }>,
  totalVotes: number,
): ElectionEntry[] {
  return sortResults(
    rawValues
      .filter((item) => item.label && item.value > 0)
      .map((item) => ({
        label: item.label,
        party: item.party,
        value: item.value,
        share: totalVotes > 0 ? Number(((item.value / totalVotes) * 100).toFixed(1)) : 0,
        color: PARTY_COLORS[item.party ?? item.label],
      })),
  );
}

function createRunningAggregate(): RunningAggregate {
  return {
    totalElectors: 0,
    totalVotes: 0,
    invalidVotes: 0,
    results: new Map(),
  };
}

function getOrCreateAggregate(map: Map<string, RunningAggregate>, key: string): RunningAggregate {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }
  const created = createRunningAggregate();
  map.set(key, created);
  return created;
}

function addAggregateEntry(aggregate: RunningAggregate, label: string, party: string | undefined, value: number): void {
  const current = aggregate.results.get(label) ?? { party, value: 0 };
  current.value += value;
  aggregate.results.set(label, current);
}

function buildCandidateResultsFromAggregate(aggregate: RunningAggregate): ElectionEntry[] {
  const validVotes = [...aggregate.results.values()].reduce((sum, item) => sum + item.value, 0);
  return createEntries(
    [...aggregate.results.entries()].map(([label, value]) => ({
      label,
      party: value.party,
      value: value.value,
    })),
    validVotes,
  );
}

function buildPartyResultsFromCandidateAggregate(aggregate: RunningAggregate): ElectionEntry[] {
  const byParty = new Map<string, number>();
  for (const item of aggregate.results.values()) {
    const party = item.party?.trim();
    if (!party) {
      continue;
    }
    byParty.set(party, (byParty.get(party) ?? 0) + item.value);
  }

  const validVotes = [...byParty.values()].reduce((sum, value) => sum + value, 0);
  return createEntries(
    [...byParty.entries()].map(([label, value]) => ({
      label,
      party: label,
      value,
    })),
    validVotes,
  );
}

function aggregateElectionRows(
  items: ElectionItem[],
  base: Omit<ElectionItem, 'results' | 'totalVotes' | 'turnout' | 'totalElectors'> & { totalElectors?: number },
): ElectionItem {
  const totals = new Map<string, { party?: string; value: number; color?: string }>();
  let totalVotes = 0;
  let totalElectors = 0;

  for (const item of items) {
    totalVotes += item.totalVotes;
    totalElectors += item.totalElectors ?? 0;
    for (const result of item.results) {
      const existing = totals.get(result.label) ?? { party: result.party, value: 0, color: result.color };
      existing.value += result.value;
      totals.set(result.label, existing);
    }
  }

  return {
    ...base,
    totalVotes,
    totalElectors,
    turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
    results: createEntries(
      [...totals.entries()].map(([label, value]) => ({
        label,
        party: value.party,
        value: value.value,
      })),
      totalVotes,
    ),
  };
}

async function loadRegionMeta(): Promise<{
  districtCodeByName: Map<string, string>;
  districtNameByCode: Map<string, string>;
  dongMetaByKey: Map<string, RegionMeta>;
  uniqueDongMetaByName: Map<string, RegionMeta>;
}> {
  const districts = JSON.parse(await readFile(DISTRICTS_JSON, 'utf-8')) as Array<{ code: string; name: string }>;
  const dongs = JSON.parse(await readFile(DONGS_JSON, 'utf-8')) as Array<{
    code: string;
    districtCode: string;
    districtName: string;
    name: string;
  }>;

  const districtCodeByName = new Map(districts.map((item) => [normalizeName(item.name), item.code]));
  const districtNameByCode = new Map(districts.map((item) => [item.code, item.name]));
  const dongMetaByKey = new Map<string, RegionMeta>();
  const duplicateDongNames = new Set<string>();
  const uniqueDongMetaByName = new Map<string, RegionMeta>();

  for (const dong of dongs) {
    const meta: RegionMeta = {
      districtCode: dong.districtCode,
      districtName: dong.districtName,
      dongCode: dong.code,
      dongName: dong.name,
    };
    const key = `${dong.districtCode}:${normalizeName(dong.name)}`;
    dongMetaByKey.set(key, meta);

    const normalizedDongName = normalizeName(dong.name);
    if (uniqueDongMetaByName.has(normalizedDongName)) {
      duplicateDongNames.add(normalizedDongName);
    } else {
      uniqueDongMetaByName.set(normalizedDongName, meta);
    }
  }

  for (const duplicated of duplicateDongNames) {
    uniqueDongMetaByName.delete(duplicated);
  }

  return { districtCodeByName, districtNameByCode, dongMetaByKey, uniqueDongMetaByName };
}

function inferDistrictCode(
  districtLabel: string,
  districtCodeByName: Map<string, string>,
  dongName?: string,
  uniqueDongMetaByName?: Map<string, RegionMeta>,
): string {
  const normalizedDistrictLabel = normalizeName(districtLabel).replace(/(갑|을|병|정)$/u, '');
  for (const [name, code] of districtCodeByName.entries()) {
    if (normalizedDistrictLabel === name || normalizedDistrictLabel.startsWith(name)) {
      return code;
    }
  }

  if (dongName && uniqueDongMetaByName) {
    return uniqueDongMetaByName.get(normalizeName(dongName))?.districtCode ?? '';
  }

  return '';
}

function resolveDongMeta(
  districtCode: string,
  dongName: string,
  dongMetaByKey: Map<string, RegionMeta>,
  uniqueDongMetaByName: Map<string, RegionMeta>,
): RegionMeta | undefined {
  const normalizedDongName = normalizeName(dongName);
  return dongMetaByKey.get(`${districtCode}:${normalizedDongName}`) ?? uniqueDongMetaByName.get(normalizedDongName);
}

function parseCombinedHeader(value: string | undefined): { party?: string; label: string } | undefined {
  const normalized = `${value ?? ''}`
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!normalized.length) {
    return undefined;
  }

  if (normalized.length === 1) {
    return { label: normalized[0] };
  }

  return {
    party: normalized[0],
    label: normalized[normalized.length - 1],
  };
}

function parseCombinedPartyCandidate(value: string | undefined): { party?: string; label: string } | undefined {
  const normalized = `${value ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === '선거인수' || normalized === '투표수' || normalized === '무효 투표수' || normalized === '기권자수') {
    return undefined;
  }

  const index = normalized.lastIndexOf(' ');
  if (index < 0) {
    return { label: normalized };
  }

  return {
    party: normalized.slice(0, index).trim(),
    label: normalized.slice(index + 1).trim(),
  };
}

function isVariableCandidateHeaderRow(
  row: Array<string | number>,
  electorsIndex: number,
  votesIndex: number,
  candidateStartIndex: number,
): boolean {
  return (
    !`${row[electorsIndex] ?? ''}`.trim() &&
    !`${row[votesIndex] ?? ''}`.trim() &&
    row.slice(candidateStartIndex).some((cell) => `${cell ?? ''}`.trim())
  );
}

function extractVariableCandidateDefs(
  rows: Array<Array<string | number>>,
  rowIndex: number,
  candidateStartIndex: number,
  candidateEndIndex: number,
): { defs: Array<{ index: number; label: string; party?: string }>; consumedRows: number } | undefined {
  const currentRow = rows[rowIndex] ?? [];
  const nextRow = rows[rowIndex + 1] ?? [];
  const currentCells = currentRow.slice(candidateStartIndex, candidateEndIndex).map((cell) => `${cell ?? ''}`.trim());

  if (!currentCells.some(Boolean)) {
    return undefined;
  }

  const hasCombinedHeaders = currentCells.some((cell) => cell.includes('\n'));
  if (hasCombinedHeaders) {
    return {
      defs: currentCells
        .map((cell, offset) => {
          const parsed = parseCombinedHeader(cell);
          if (!parsed) {
            return undefined;
          }
          return {
            index: candidateStartIndex + offset,
            label: parsed.label,
            party: parsed.party,
          };
        })
        .filter((item): item is { index: number; label: string; party?: string } => Boolean(item)),
      consumedRows: 1,
    };
  }

  const nextCells = nextRow.slice(candidateStartIndex, candidateEndIndex).map((cell) => `${cell ?? ''}`.trim());
  const nextCellsAreNumeric = nextCells.filter(Boolean).every((cell) => /^[\d,.-]+$/.test(cell));
  if (nextCellsAreNumeric) {
    return {
      defs: currentCells
        .map((label, offset) => {
          if (!label) {
            return undefined;
          }
          return {
            index: candidateStartIndex + offset,
            label,
          };
        })
        .filter((item): item is { index: number; label: string; party?: string } => Boolean(item)),
      consumedRows: 1,
    };
  }

  if (!nextCells.some(Boolean)) {
    return undefined;
  }

  return {
    defs: currentCells
      .map((party, offset) => {
        const label = nextCells[offset];
        if (!label) {
          return undefined;
        }
        return {
          index: candidateStartIndex + offset,
          label,
          party: party || undefined,
        };
      })
      .filter((item): item is { index: number; label: string; party?: string } => Boolean(item)),
    consumedRows: 2,
  };
}

function parsePresidentialElection2025(
  inputPath: string,
  regionMeta: Awaited<ReturnType<typeof loadRegionMeta>>,
): ElectionItem[] {
  const workbook = XLSX.readFile(inputPath);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' }) as Array<Array<string | number>>;
  const candidateHeaders = rows[4] ?? [];
  const candidateDefs = candidateHeaders
    .map((cell, index) => {
      if (index < 6) {
        return undefined;
      }

      const parsed = parseCombinedHeader(`${cell ?? ''}`);
      if (!parsed || parsed.label === '계') {
        return undefined;
      }

      return {
        index,
        party: parsed.party,
        label: parsed.label,
      };
    })
    .filter((item): item is { index: number; party?: string; label: string } => Boolean(item));

  const items: ElectionItem[] = [];
  let currentCity = '';
  let currentDistrict = '';

  for (const row of rows.slice(7)) {
    const city = `${row[0] ?? ''}`.trim();
    const district = `${row[1] ?? ''}`.trim();
    const dongName = `${row[2] ?? ''}`.trim();
    const pollName = `${row[3] ?? ''}`.trim();

    if (city) {
      currentCity = city;
    }
    if (district) {
      currentDistrict = district;
    }
    if (currentCity !== '서울특별시') {
      continue;
    }

    const totalElectors = parseNumber(row[4]);
    const totalVotes = parseNumber(row[5]);
    const results = createEntries(
      candidateDefs.map((candidate) => ({
        label: candidate.label,
        party: candidate.party,
        value: parseNumber(row[candidate.index]),
      })),
      candidateDefs.reduce((sum, candidate) => sum + parseNumber(row[candidate.index]), 0),
    );

    if (district === '합계(특별시)') {
      items.push({
        electionId: 'presidential-2025',
        electionName: '제21대 대통령선거',
        electionType: 'presidential',
        electionYear: 2025,
        resultMode: 'candidate',
        scopeLevel: 'city',
        scopeCode: 'seoul',
        scopeName: '서울특별시',
        turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
        totalVotes,
        totalElectors,
        updatedAt: '2025-06-03',
        source: '중앙선거관리위원회 선거통계시스템',
        results,
      });
      continue;
    }

    const districtCode = inferDistrictCode(currentDistrict, regionMeta.districtCodeByName);
    const districtName = regionMeta.districtNameByCode.get(districtCode) ?? currentDistrict;

    if (dongName === '합계' && districtCode) {
      items.push({
        electionId: 'presidential-2025',
        electionName: '제21대 대통령선거',
        electionType: 'presidential',
        electionYear: 2025,
        resultMode: 'candidate',
        scopeLevel: 'district',
        scopeCode: districtCode,
        scopeName: districtName,
        districtCode,
        districtName,
        turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
        totalVotes,
        totalElectors,
        updatedAt: '2025-06-03',
        source: '중앙선거관리위원회 선거통계시스템',
        results,
      });
      continue;
    }

    if (!dongName || pollName !== '소계' || SPECIAL_ROWS.has(dongName) || !districtCode) {
      continue;
    }

    const dongMeta = resolveDongMeta(districtCode, dongName, regionMeta.dongMetaByKey, regionMeta.uniqueDongMetaByName);
    if (!dongMeta) {
      continue;
    }

    items.push({
      electionId: 'presidential-2025',
      electionName: '제21대 대통령선거',
      electionType: 'presidential',
      electionYear: 2025,
      resultMode: 'candidate',
      scopeLevel: 'dong',
      scopeCode: dongMeta.dongCode,
      scopeName: dongMeta.dongName,
      districtCode: dongMeta.districtCode,
      districtName: dongMeta.districtName,
      dongCode: dongMeta.dongCode,
      dongName: dongMeta.dongName,
      turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
      totalVotes,
      totalElectors,
      updatedAt: '2025-06-03',
      source: '중앙선거관리위원회 선거통계시스템',
      results,
    });
  }

  return items;
}

async function parsePresidentialElection2022(
  inputPath: string,
  regionMeta: Awaited<ReturnType<typeof loadRegionMeta>>,
): Promise<ElectionItem[]> {
  const text = await readFile(inputPath, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const districtAggregates = new Map<string, RunningAggregate>();
  const dongAggregates = new Map<string, RunningAggregate>();

  for (const row of parsed.data) {
    const city = `${row['시도명'] ?? ''}`.trim().replace(/^\uFEFF/, '');
    const districtLabel = `${row['구시군명'] ?? ''}`.trim();
    const dongLabel = `${row['읍면동명'] ?? ''}`.trim();
    const candidateLabel = `${row['후보자'] ?? ''}`.trim();
    const value = parseNumber(row['득표수']);

    if (city !== '서울특별시') {
      continue;
    }

    const districtCode = inferDistrictCode(districtLabel, regionMeta.districtCodeByName, dongLabel, regionMeta.uniqueDongMetaByName);
    if (!districtCode) {
      continue;
    }

    const districtAggregate = getOrCreateAggregate(districtAggregates, districtCode);
    if (candidateLabel === '선거인수') {
      districtAggregate.totalElectors += value;
    } else if (candidateLabel === '투표수') {
      districtAggregate.totalVotes += value;
    } else if (candidateLabel === '무효 투표수') {
      districtAggregate.invalidVotes += value;
    } else {
      const parsedCandidate = parseCombinedPartyCandidate(candidateLabel);
      if (parsedCandidate) {
        addAggregateEntry(districtAggregate, parsedCandidate.label, parsedCandidate.party, value);
      }
    }

    const dongMeta = resolveDongMeta(districtCode, dongLabel, regionMeta.dongMetaByKey, regionMeta.uniqueDongMetaByName);
    if (!dongMeta) {
      continue;
    }

    const dongAggregate = getOrCreateAggregate(dongAggregates, dongMeta.dongCode);
    if (candidateLabel === '선거인수') {
      dongAggregate.totalElectors += value;
    } else if (candidateLabel === '투표수') {
      dongAggregate.totalVotes += value;
    } else if (candidateLabel === '무효 투표수') {
      dongAggregate.invalidVotes += value;
    } else {
      const parsedCandidate = parseCombinedPartyCandidate(candidateLabel);
      if (parsedCandidate) {
        addAggregateEntry(dongAggregate, parsedCandidate.label, parsedCandidate.party, value);
      }
    }
  }

  const districtItems: ElectionItem[] = [...districtAggregates.entries()]
    .map(([districtCode, aggregate]) => ({
      electionId: 'presidential-2022',
      electionName: '제20대 대통령선거',
      electionType: 'presidential',
      electionYear: 2022,
      resultMode: 'candidate',
      scopeLevel: 'district' as const,
      scopeCode: districtCode,
      scopeName: regionMeta.districtNameByCode.get(districtCode) ?? districtCode,
      districtCode,
      districtName: regionMeta.districtNameByCode.get(districtCode) ?? districtCode,
      turnout: aggregate.totalElectors > 0 ? aggregate.totalVotes / aggregate.totalElectors : 0,
      totalVotes: aggregate.totalVotes,
      totalElectors: aggregate.totalElectors,
      updatedAt: '2022-03-09',
      source: '공공데이터포털 · 중앙선거관리위원회',
      results: buildCandidateResultsFromAggregate(aggregate),
    }))
    .sort((left, right) => left.scopeName.localeCompare(right.scopeName, 'ko'));

  const dongItems: ElectionItem[] = [...dongAggregates.entries()]
    .map(([dongCode, aggregate]) => {
      const meta = [...regionMeta.dongMetaByKey.values()].find((item) => item.dongCode === dongCode);
      if (!meta) {
        return undefined;
      }

      return {
        electionId: 'presidential-2022',
        electionName: '제20대 대통령선거',
        electionType: 'presidential',
        electionYear: 2022,
        resultMode: 'candidate',
        scopeLevel: 'dong' as const,
        scopeCode: dongCode,
        scopeName: meta.dongName,
        districtCode: meta.districtCode,
        districtName: meta.districtName,
        dongCode: meta.dongCode,
        dongName: meta.dongName,
        turnout: aggregate.totalElectors > 0 ? aggregate.totalVotes / aggregate.totalElectors : 0,
        totalVotes: aggregate.totalVotes,
        totalElectors: aggregate.totalElectors,
        updatedAt: '2022-03-09',
        source: '공공데이터포털 · 중앙선거관리위원회',
        results: buildCandidateResultsFromAggregate(aggregate),
      };
    })
    .filter((item): item is ElectionItem => Boolean(item))
    .sort((left, right) => left.scopeName.localeCompare(right.scopeName, 'ko'));

  const cityItem = aggregateElectionRows(districtItems, {
    electionId: 'presidential-2022',
    electionName: '제20대 대통령선거',
    electionType: 'presidential',
    electionYear: 2022,
    resultMode: 'candidate',
    scopeLevel: 'city',
    scopeCode: 'seoul',
    scopeName: '서울특별시',
    updatedAt: '2022-03-09',
    source: '공공데이터포털 · 중앙선거관리위원회',
  });

  return [cityItem, ...districtItems, ...dongItems];
}

function parseAssemblyProportionalElection(
  inputPath: string,
  regionMeta: Awaited<ReturnType<typeof loadRegionMeta>>,
): ElectionItem[] {
  const workbook = XLSX.readFile(inputPath);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets['비례대표'], { header: 1, defval: '' }) as Array<Array<string | number>>;
  const totalVotesIndex = rows[0].findIndex((cell) => `${cell ?? ''}`.includes('정당별 득표수\r\n계'));
  const parties = (rows[1] ?? [])
    .map((cell, index) => ({ index, label: `${cell ?? ''}`.trim() }))
    .filter((item) => item.index >= 6 && item.index < totalVotesIndex && item.label);

  const districtItems: ElectionItem[] = [];
  const dongItems: ElectionItem[] = [];

  for (const row of rows.slice(3)) {
    const city = `${row[0] ?? ''}`.trim();
    const districtName = `${row[1] ?? ''}`.trim();
    const dongName = `${row[2] ?? ''}`.trim();
    const pollName = `${row[3] ?? ''}`.trim();

    if (city !== '서울특별시') {
      continue;
    }

    const districtCode = inferDistrictCode(districtName, regionMeta.districtCodeByName);
    const totalElectors = parseNumber(row[4]);
    const totalVotes = parseNumber(row[5]);
    const validVotes = parseNumber(row[totalVotesIndex]);
    const results = createEntries(
      parties.map((party) => ({
        label: party.label,
        party: party.label,
        value: parseNumber(row[party.index]),
      })),
      validVotes,
    );

    if (dongName === '합계' && districtCode) {
      districtItems.push({
        electionId: 'assembly-pr-2024',
        electionName: '제22대 국회의원선거 비례대표',
        electionType: 'assembly',
        electionYear: 2024,
        resultMode: 'party',
        scopeLevel: 'district',
        scopeCode: districtCode,
        scopeName: regionMeta.districtNameByCode.get(districtCode) ?? districtName,
        districtCode,
        districtName: regionMeta.districtNameByCode.get(districtCode) ?? districtName,
        turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
        totalVotes: validVotes,
        totalElectors,
        updatedAt: '2024-04-10',
        source: '중앙선거관리위원회 선거통계시스템',
        results,
      });
      continue;
    }

    if (!dongName || pollName !== '소계' || SPECIAL_ROWS.has(dongName) || !districtCode) {
      continue;
    }

    const dongMeta = resolveDongMeta(districtCode, dongName, regionMeta.dongMetaByKey, regionMeta.uniqueDongMetaByName);
    if (!dongMeta) {
      continue;
    }

    dongItems.push({
      electionId: 'assembly-pr-2024',
      electionName: '제22대 국회의원선거 비례대표',
      electionType: 'assembly',
      electionYear: 2024,
      resultMode: 'party',
      scopeLevel: 'dong',
      scopeCode: dongMeta.dongCode,
      scopeName: dongMeta.dongName,
      districtCode: dongMeta.districtCode,
      districtName: dongMeta.districtName,
      dongCode: dongMeta.dongCode,
      dongName: dongMeta.dongName,
      turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
      totalVotes: validVotes,
      totalElectors,
      updatedAt: '2024-04-10',
      source: '중앙선거관리위원회 선거통계시스템',
      results,
    });
  }

  const cityItem = aggregateElectionRows(districtItems, {
    electionId: 'assembly-pr-2024',
    electionName: '제22대 국회의원선거 비례대표',
    electionType: 'assembly',
    electionYear: 2024,
    resultMode: 'party',
    scopeLevel: 'city',
    scopeCode: 'seoul',
    scopeName: '서울특별시',
    updatedAt: '2024-04-10',
    source: '중앙선거관리위원회 선거통계시스템',
  });

  return [cityItem, ...districtItems, ...dongItems];
}

function parseAssemblyConstituencyElection(
  inputPath: string,
  regionMeta: Awaited<ReturnType<typeof loadRegionMeta>>,
): ElectionItem[] {
  const workbook = XLSX.readFile(inputPath);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets['지역구'], { header: 1, defval: '' }) as Array<Array<string | number>>;
  const totalVotesIndex = rows[0].findIndex(
    (cell) => `${cell ?? ''}`.includes('후보자별 득표수') && `${cell ?? ''}`.includes('계'),
  );
  let candidateDefs =
    extractVariableCandidateDefs(rows, 1, 6, totalVotesIndex)?.defs.filter(
      (item): item is { index: number; label: string; party: string } => Boolean(item),
    ) ?? [];

  const dongItems: ElectionItem[] = [];

  for (let index = 3; index < rows.length; index += 1) {
    const row = rows[index];
    const city = `${row[0] ?? ''}`.trim();
    const constituencyName = `${row[1] ?? ''}`.trim();
    const dongName = `${row[2] ?? ''}`.trim();
    const pollName = `${row[3] ?? ''}`.trim();

    if (isVariableCandidateHeaderRow(row, 4, 5, 6)) {
      const extracted = extractVariableCandidateDefs(rows, index, 6, totalVotesIndex);
      if (extracted) {
        candidateDefs = extracted.defs.filter((item): item is { index: number; label: string; party: string } => Boolean(item));
        index += extracted.consumedRows - 1;
        continue;
      }
    }

    if (city !== '서울특별시') {
      continue;
    }

    const districtCode = inferDistrictCode(constituencyName, regionMeta.districtCodeByName, dongName, regionMeta.uniqueDongMetaByName);
    if (!districtCode) {
      continue;
    }

    const totalElectors = parseNumber(row[4]);
    const totalVotes = parseNumber(row[5]);
    const validVotes = parseNumber(row[totalVotesIndex]);

    if (!dongName || pollName !== '소계' || SPECIAL_ROWS.has(dongName)) {
      continue;
    }

    const dongMeta = resolveDongMeta(districtCode, dongName, regionMeta.dongMetaByKey, regionMeta.uniqueDongMetaByName);
    if (!dongMeta) {
      continue;
    }

    dongItems.push({
      electionId: 'assembly-constituency-2024',
      electionName: '제22대 국회의원선거 지역구',
      electionType: 'assembly',
      electionYear: 2024,
      resultMode: 'candidate',
      scopeLevel: 'dong',
      scopeCode: dongMeta.dongCode,
      scopeName: dongMeta.dongName,
      districtCode: dongMeta.districtCode,
      districtName: dongMeta.districtName,
      dongCode: dongMeta.dongCode,
      dongName: dongMeta.dongName,
      constituencyName,
      turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
      totalVotes,
      totalElectors,
      updatedAt: '2024-04-10',
      source: '중앙선거관리위원회 선거통계시스템',
      results: createEntries(
        candidateDefs.map((candidate) => ({
          label: candidate.label,
          party: candidate.party,
          value: parseNumber(row[candidate.index]),
        })),
        validVotes,
      ),
    });
  }

  const districtAggregates = new Map<
    string,
    RunningAggregate & {
      districtName: string;
    }
  >();
  for (const item of dongItems) {
    if (!item.districtCode || !item.districtName) {
      continue;
    }

    const aggregate = districtAggregates.get(item.districtCode) ?? {
      ...createRunningAggregate(),
      districtName: item.districtName,
    };

    aggregate.totalElectors += item.totalElectors ?? 0;
    aggregate.totalVotes += item.totalVotes;
    for (const result of item.results) {
      addAggregateEntry(aggregate, result.label, result.party, result.value);
    }

    districtAggregates.set(item.districtCode, aggregate);
  }

  const districtItems: ElectionItem[] = [...districtAggregates.entries()]
    .map(([districtCode, aggregate]) => ({
      electionId: 'assembly-constituency-2024',
      electionName: '제22대 국회의원선거 지역구',
      electionType: 'assembly',
      electionYear: 2024,
      resultMode: 'party',
      scopeLevel: 'district' as const,
      scopeCode: districtCode,
      scopeName: aggregate.districtName,
      districtCode,
      districtName: aggregate.districtName,
      turnout: aggregate.totalElectors > 0 ? aggregate.totalVotes / aggregate.totalElectors : 0,
      totalVotes: aggregate.totalVotes,
      totalElectors: aggregate.totalElectors,
      updatedAt: '2024-04-10',
      source: '중앙선거관리위원회 선거통계시스템',
      results: buildPartyResultsFromCandidateAggregate(aggregate),
    }))
    .sort((left, right) => left.scopeName.localeCompare(right.scopeName, 'ko'));

  const cityItem = aggregateElectionRows(districtItems, {
    electionId: 'assembly-constituency-2024',
    electionName: '제22대 국회의원선거 지역구',
    electionType: 'assembly',
    electionYear: 2024,
    resultMode: 'party',
    scopeLevel: 'city',
    scopeCode: 'seoul',
    scopeName: '서울특별시',
    updatedAt: '2024-04-10',
    source: '중앙선거관리위원회 선거통계시스템',
  });

  return [cityItem, ...districtItems, ...dongItems];
}

function parseLocalElectionSheet(
  inputPath: string,
  config: LocalSheetConfig,
  regionMeta: Awaited<ReturnType<typeof loadRegionMeta>>,
): ElectionItem[] {
  const workbook = XLSX.readFile(inputPath);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[config.sheetName], { header: 1, defval: '' }) as Array<Array<string | number>>;
  const totalVotesIndex = rows[0].findIndex((cell) => `${cell ?? ''}`.trim() === '계');
  let candidateDefs =
    extractVariableCandidateDefs(rows, 2, config.indexes.votes + 1, totalVotesIndex)?.defs ?? [];

  const districtItems: ElectionItem[] = [];
  const dongItems: ElectionItem[] = [];

  let currentCity = '';
  let currentDistrict = '';

  for (let index = 3; index < rows.length; index += 1) {
    const row = rows[index];
    const city = `${row[config.indexes.city] ?? ''}`.trim();
    const districtLabel = `${row[config.indexes.district] ?? ''}`.trim();
    const dongName = `${row[config.indexes.dong] ?? ''}`.trim();
    const pollName = `${row[config.indexes.poll] ?? ''}`.trim();

    if (city) {
      currentCity = city;
    }
    if (districtLabel) {
      currentDistrict = districtLabel;
    }

    if (isVariableCandidateHeaderRow(row, config.indexes.electors, config.indexes.votes, config.indexes.votes + 1)) {
      const extracted = extractVariableCandidateDefs(rows, index, config.indexes.votes + 1, totalVotesIndex);
      if (extracted) {
        candidateDefs = extracted.defs;
        index += extracted.consumedRows - 1;
        continue;
      }
    }

    if (currentCity !== '서울특별시') {
      continue;
    }

    const totalElectors = parseNumber(row[config.indexes.electors]);
    const totalVotes = parseNumber(row[config.indexes.votes]);
    const validVotes = parseNumber(row[totalVotesIndex]);
    const districtCode = inferDistrictCode(currentDistrict, regionMeta.districtCodeByName, dongName, regionMeta.uniqueDongMetaByName);
    const districtName = regionMeta.districtNameByCode.get(districtCode) ?? currentDistrict;
    const results = createEntries(
      candidateDefs.map((candidate) => ({
        label: candidate.label,
        party: candidate.party,
        value: parseNumber(row[candidate.index]),
      })),
      validVotes,
    );

    if (dongName === '합계' && districtCode) {
      districtItems.push({
        electionId: config.electionId,
        electionName: config.electionName,
        electionType: config.electionType,
        electionYear: config.electionYear,
        resultMode: config.resultMode,
        scopeLevel: 'district',
        scopeCode: districtCode,
        scopeName: districtName,
        districtCode,
        districtName,
        turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
        totalVotes,
        totalElectors,
        updatedAt: config.updatedAt,
        source: config.source,
        results,
      });
      continue;
    }

    if (!dongName || pollName !== '소계' || SPECIAL_ROWS.has(dongName) || !districtCode) {
      continue;
    }

    const dongMeta = resolveDongMeta(districtCode, dongName, regionMeta.dongMetaByKey, regionMeta.uniqueDongMetaByName);
    if (!dongMeta) {
      continue;
    }

    dongItems.push({
      electionId: config.electionId,
      electionName: config.electionName,
      electionType: config.electionType,
      electionYear: config.electionYear,
      resultMode: config.resultMode,
      scopeLevel: 'dong',
      scopeCode: dongMeta.dongCode,
      scopeName: dongMeta.dongName,
      districtCode: dongMeta.districtCode,
      districtName: dongMeta.districtName,
      dongCode: dongMeta.dongCode,
      dongName: dongMeta.dongName,
      turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
      totalVotes,
      totalElectors,
      updatedAt: config.updatedAt,
      source: config.source,
      results,
    });
  }

  if (!config.citywide) {
    return [...districtItems, ...dongItems];
  }

  const cityItem = aggregateElectionRows(districtItems, {
    electionId: config.electionId,
    electionName: config.electionName,
    electionType: config.electionType,
    electionYear: config.electionYear,
    resultMode: config.resultMode,
    scopeLevel: 'city',
    scopeCode: 'seoul',
    scopeName: '서울특별시',
    updatedAt: config.updatedAt,
    source: config.source,
  });

  return [cityItem, ...districtItems, ...dongItems];
}

function parseLocalConstituencyElectionSheet(
  inputPath: string,
  config: LocalConstituencySheetConfig,
  regionMeta: Awaited<ReturnType<typeof loadRegionMeta>>,
): ElectionItem[] {
  const workbook = XLSX.readFile(inputPath);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[config.sheetName], { header: 1, defval: '' }) as Array<Array<string | number>>;
  const totalVotesIndex = rows[0].findIndex((cell) => `${cell ?? ''}`.trim() === '계');
  let candidateDefs =
    extractVariableCandidateDefs(rows, 2, config.indexes.votes + 1, totalVotesIndex)?.defs ?? [];

  const dongItems: ElectionItem[] = [];
  let currentCity = '';
  let currentDistrict = '';
  let currentConstituency = '';

  for (let index = 3; index < rows.length; index += 1) {
    const row = rows[index];
    const city = `${row[config.indexes.city] ?? ''}`.trim();
    const districtLabel = `${row[config.indexes.district] ?? ''}`.trim();
    const constituencyName = `${row[config.constituency] ?? ''}`.trim();
    const dongName = `${row[config.indexes.dong] ?? ''}`.trim();
    const pollName = `${row[config.indexes.poll] ?? ''}`.trim();

    if (city) {
      currentCity = city;
    }
    if (districtLabel) {
      currentDistrict = districtLabel;
    }
    if (constituencyName) {
      currentConstituency = constituencyName;
    }

    if (isVariableCandidateHeaderRow(row, config.indexes.electors, config.indexes.votes, config.indexes.votes + 1)) {
      const extracted = extractVariableCandidateDefs(rows, index, config.indexes.votes + 1, totalVotesIndex);
      if (extracted) {
        candidateDefs = extracted.defs;
        index += extracted.consumedRows - 1;
        continue;
      }
    }

    if (currentCity !== '서울특별시') {
      continue;
    }

    const districtCode = inferDistrictCode(currentDistrict, regionMeta.districtCodeByName, dongName, regionMeta.uniqueDongMetaByName);
    if (!districtCode) {
      continue;
    }

    if (!dongName || pollName !== '소계' || SPECIAL_ROWS.has(dongName)) {
      continue;
    }

    const dongMeta = resolveDongMeta(districtCode, dongName, regionMeta.dongMetaByKey, regionMeta.uniqueDongMetaByName);
    if (!dongMeta) {
      continue;
    }

    const totalElectors = parseNumber(row[config.indexes.electors]);
    const totalVotes = parseNumber(row[config.indexes.votes]);
    const validVotes = parseNumber(row[totalVotesIndex]);
    dongItems.push({
      electionId: config.electionId,
      electionName: config.electionName,
      electionType: config.electionType,
      electionYear: config.electionYear,
      resultMode: 'candidate',
      scopeLevel: 'dong',
      scopeCode: dongMeta.dongCode,
      scopeName: dongMeta.dongName,
      districtCode: dongMeta.districtCode,
      districtName: dongMeta.districtName,
      dongCode: dongMeta.dongCode,
      dongName: dongMeta.dongName,
      constituencyName: currentConstituency,
      turnout: totalElectors > 0 ? totalVotes / totalElectors : 0,
      totalVotes,
      totalElectors,
      updatedAt: config.updatedAt,
      source: config.source,
      results: createEntries(
        candidateDefs.map((candidate) => ({
          label: candidate.label,
          party: candidate.party,
          value: parseNumber(row[candidate.index]),
        })),
        validVotes,
      ),
    });
  }

  const districtAggregates = new Map<
    string,
    RunningAggregate & {
      districtName: string;
    }
  >();
  for (const item of dongItems) {
    if (!item.districtCode || !item.districtName) {
      continue;
    }

    const aggregate = districtAggregates.get(item.districtCode) ?? {
      ...createRunningAggregate(),
      districtName: item.districtName,
    };

    aggregate.totalElectors += item.totalElectors ?? 0;
    aggregate.totalVotes += item.totalVotes;
    for (const result of item.results) {
      addAggregateEntry(aggregate, result.label, result.party, result.value);
    }
    districtAggregates.set(item.districtCode, aggregate);
  }

  const districtItems: ElectionItem[] = [...districtAggregates.entries()]
    .map(([districtCode, aggregate]) => ({
      electionId: config.electionId,
      electionName: config.electionName,
      electionType: config.electionType,
      electionYear: config.electionYear,
      resultMode: 'party' as const,
      scopeLevel: 'district' as const,
      scopeCode: districtCode,
      scopeName: aggregate.districtName,
      districtCode,
      districtName: aggregate.districtName,
      turnout: aggregate.totalElectors > 0 ? aggregate.totalVotes / aggregate.totalElectors : 0,
      totalVotes: aggregate.totalVotes,
      totalElectors: aggregate.totalElectors,
      updatedAt: config.updatedAt,
      source: config.source,
      results: buildPartyResultsFromCandidateAggregate(aggregate),
    }))
    .sort((left, right) => left.scopeName.localeCompare(right.scopeName, 'ko'));

  if (!config.citywide) {
    return [...districtItems, ...dongItems];
  }

  const cityItem = aggregateElectionRows(districtItems, {
    electionId: config.electionId,
    electionName: config.electionName,
    electionType: config.electionType,
    electionYear: config.electionYear,
    resultMode: 'party',
    scopeLevel: 'city',
    scopeCode: 'seoul',
    scopeName: '서울특별시',
    updatedAt: config.updatedAt,
    source: config.source,
  });

  return [cityItem, ...districtItems, ...dongItems];
}

async function main(): Promise<void> {
  const presidential21Input = path.resolve(getArg('--presidential21-input') ?? DEFAULT_PRESIDENTIAL_21_INPUT);
  const presidential20Input = path.resolve(getArg('--presidential20-input') ?? DEFAULT_PRESIDENTIAL_20_INPUT);
  const assemblyInput = path.resolve(getArg('--assembly-input') ?? DEFAULT_ASSEMBLY_INPUT);
  const localInput = path.resolve(getArg('--local-input') ?? DEFAULT_LOCAL_INPUT);
  const outputPath = path.resolve(getArg('--output') ?? DEFAULT_OUTPUT);
  const regionMeta = await loadRegionMeta();

  const localConfigs: LocalSheetConfig[] = [
    {
      sheetName: '시·도지사',
      electionId: 'local-mayor-2022',
      electionName: '제8회 전국동시지방선거 서울시장',
      electionType: 'mayoral',
      electionYear: 2022,
      resultMode: 'candidate',
      updatedAt: '2022-06-01',
      source: '공공데이터포털 · 중앙선거관리위원회',
      citywide: true,
      indexes: { city: 0, district: 1, dong: 2, poll: 3, electors: 4, votes: 5 },
    },
    {
      sheetName: '구·시·군의장',
      electionId: 'local-district-head-2022',
      electionName: '제8회 전국동시지방선거 구청장',
      electionType: 'mayoral',
      electionYear: 2022,
      resultMode: 'candidate',
      updatedAt: '2022-06-01',
      source: '공공데이터포털 · 중앙선거관리위원회',
      citywide: false,
      indexes: { city: 0, district: 1, dong: 3, poll: 4, electors: 5, votes: 6 },
    },
    {
      sheetName: '교육감',
      electionId: 'local-superintendent-2022',
      electionName: '제8회 전국동시지방선거 서울시교육감',
      electionType: 'local',
      electionYear: 2022,
      resultMode: 'candidate',
      updatedAt: '2022-06-01',
      source: '공공데이터포털 · 중앙선거관리위원회',
      citywide: true,
      indexes: { city: 0, district: 1, dong: 2, poll: 3, electors: 4, votes: 5 },
    },
    {
      sheetName: '광역의원비례대표',
      electionId: 'local-metropolitan-pr-2022',
      electionName: '제8회 전국동시지방선거 서울시의원 비례대표',
      electionType: 'local',
      electionYear: 2022,
      resultMode: 'party',
      updatedAt: '2022-06-01',
      source: '공공데이터포털 · 중앙선거관리위원회',
      citywide: true,
      indexes: { city: 0, district: 1, dong: 2, poll: 3, electors: 4, votes: 5 },
    },
    {
      sheetName: '기초의원비례대표',
      electionId: 'local-local-pr-2022',
      electionName: '제8회 전국동시지방선거 구의원 비례대표',
      electionType: 'local',
      electionYear: 2022,
      resultMode: 'party',
      updatedAt: '2022-06-01',
      source: '공공데이터포털 · 중앙선거관리위원회',
      citywide: true,
      indexes: { city: 0, district: 1, dong: 3, poll: 4, electors: 5, votes: 6 },
    },
  ];

  const localConstituencyConfigs: LocalConstituencySheetConfig[] = [
    {
      sheetName: '시·도의회의원',
      electionId: 'local-metropolitan-council-2022',
      electionName: '제8회 전국동시지방선거 서울시의원',
      electionType: 'local',
      electionYear: 2022,
      resultMode: 'candidate',
      updatedAt: '2022-06-01',
      source: '공공데이터포털 · 중앙선거관리위원회',
      citywide: true,
      constituency: 2,
      indexes: { city: 0, district: 1, dong: 3, poll: 4, electors: 5, votes: 6 },
    },
    {
      sheetName: '구·시·군의회의원',
      electionId: 'local-local-council-2022',
      electionName: '제8회 전국동시지방선거 구의원',
      electionType: 'local',
      electionYear: 2022,
      resultMode: 'candidate',
      updatedAt: '2022-06-01',
      source: '공공데이터포털 · 중앙선거관리위원회',
      citywide: true,
      constituency: 2,
      indexes: { city: 0, district: 1, dong: 3, poll: 4, electors: 5, votes: 6 },
    },
  ];

  const items = [
    ...parsePresidentialElection2025(presidential21Input, regionMeta),
    ...(await parsePresidentialElection2022(presidential20Input, regionMeta)),
    ...parseAssemblyConstituencyElection(assemblyInput, regionMeta),
    ...parseAssemblyProportionalElection(assemblyInput, regionMeta),
    ...localConfigs.flatMap((config) => parseLocalElectionSheet(localInput, config, regionMeta)),
    ...localConstituencyConfigs.flatMap((config) => parseLocalConstituencyElectionSheet(localInput, config, regionMeta)),
  ].sort((left, right) => {
    if (left.electionYear !== right.electionYear) {
      return right.electionYear - left.electionYear;
    }
    if (left.electionName !== right.electionName) {
      return left.electionName.localeCompare(right.electionName, 'ko');
    }
    if (left.scopeLevel !== right.scopeLevel) {
      return left.scopeLevel.localeCompare(right.scopeLevel);
    }
    return left.scopeName.localeCompare(right.scopeName, 'ko');
  });

  const dataset: ElectionDataset = {
    updatedAt: '2025-06-03',
    source: '중앙선거관리위원회 선거통계시스템 공식 스냅샷',
    items,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8');
  console.log(`선거 데이터 저장 완료: ${outputPath}`);
  console.log(`총 항목 수: ${items.length}`);
  console.log(`선거 종류: ${[...new Set(items.map((item) => item.electionId))].join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
