import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';
import XLSX from 'xlsx';
import { normalizeDongName } from '../src/utils/normalizeDongName';
import type {
  AgeBandStats,
  AgeGenderDataset,
  HouseholdCompositionStats,
  PopulationDataset,
  PopulationStats,
} from '../src/types';

type Row = Record<string, unknown>;

/*
 * 실데이터 입력 예시
 * - 파일명: raw/population_month_2026_02.csv
 * - 파일명: raw/age_population_month_2026_02.csv
 * - 파일명: raw/household_size_month_2026_02.csv
 * - 파일명: raw/seoul_population.xlsx
 * - 시트명 예시: Sheet1, 동별통계
 *
 * 공식 행정안전부 주민등록 인구통계 CSV 기대 컬럼 예시
 * - 인구/세대 파일: 행정구역 | 2026년02월_총인구수 | 2026년02월_세대수 | 2026년02월_세대당 인구 | 2026년02월_남자 인구수 | 2026년02월_여자 인구수
 * - 연령 파일: 행정구역 | 2026년02월_계_0~9세 | 2026년02월_남_0~9세 | 2026년02월_여_0~9세 ... | 2026년02월_계_100세 이상
 * - 세대구성 파일: 행정구역 | 2026년02월_전체세대 | 2026년02월_1인세대 | 2026년02월_2인세대 | ... | 2026년02월_10인이상세대
 *
 * 커스텀 파일 alias 예시
 * - 동명: 행정동 | 동명 | adm_nm | dongName
 * - 총인구: 총인구수 | 총인구 | population_total | totalPopulation
 * - 남성: 남자인구수 | 남성인구 | malePopulation
 * - 여성: 여자인구수 | 여성인구 | femalePopulation
 * - 세대수: 세대수 | households
 * - 세대구성: 1인가구 | 1인세대 | onePersonHouseholds / 2인가구 | 2인세대 | twoPersonHouseholds ...
 *
 * 출력 파일 예시
 * - public/data/population_by_dong.json
 * - public/data/age_gender_by_dong.json
 */

const DEFAULT_OUTPUT = path.resolve('public/data/population_by_dong.json');
const DEFAULT_AGE_OUTPUT = path.resolve('public/data/age_gender_by_dong.json');
const DEFAULT_DISTRICT = '강서구';

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getCell(row: Row, keys: readonly string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return `${value}`.trim();
    }
  }

  return '';
}

function getNumber(row: Row, keys: readonly string[]): number {
  const raw = getCell(row, keys).replace(/,/g, '').trim();
  return raw ? Number(raw) : 0;
}

function parseNumber(value: unknown): number {
  const normalized = `${value ?? ''}`.replace(/,/g, '').trim();
  return normalized ? Number(normalized) : 0;
}

function decodeCsv(buffer: Buffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (utf8.includes('행정구역')) {
    return utf8;
  }

  return new TextDecoder('euc-kr').decode(buffer);
}

async function readRows(inputPath: string, sheetName?: string): Promise<Row[]> {
  const extension = path.extname(inputPath).toLowerCase();

  if (extension === '.csv') {
    const csvBuffer = await readFile(inputPath);
    const parsed = Papa.parse<Row>(decodeCsv(csvBuffer), {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message ?? 'CSV 파싱 오류');
    }
    return parsed.data;
  }

  const workbook = XLSX.readFile(inputPath);
  const targetSheet = sheetName ?? workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheet];
  if (!worksheet) {
    throw new Error(`시트를 찾을 수 없습니다: ${targetSheet}`);
  }

  return XLSX.utils.sheet_to_json<Row>(worksheet, { defval: '' });
}

function extractDongName(areaLabel: string, districtName: string): string {
  const cleaned = areaLabel.replace(/\([^)]*\)/g, '').trim();
  const withoutPrefix = cleaned
    .replace(/^서울특별시\s*/u, '')
    .replace(new RegExp(`^${districtName}\\s*`, 'u'), '')
    .trim();

  return normalizeDongName(withoutPrefix);
}

function isDistrictDongRow(areaLabel: string, districtName: string): boolean {
  if (!areaLabel.startsWith(`서울특별시 ${districtName}`)) {
    return false;
  }

  const dongName = extractDongName(areaLabel, districtName);
  return Boolean(dongName && dongName.endsWith('동'));
}

function isOfficialPopulationRow(row: Row): boolean {
  return '행정구역' in row && Object.keys(row).some((key) => key.includes('_총인구수'));
}

function isOfficialHouseholdCompositionRow(row: Row): boolean {
  return '행정구역' in row && Object.keys(row).some((key) => key.includes('_1인세대'));
}

function buildAgeBandKeys(prefix: string): Array<{ ageGroup: string; totalKey: string; maleKey: string; femaleKey: string }> {
  const bands = ['0~9세', '10~19세', '20~29세', '30~39세', '40~49세', '50~59세', '60~69세', '70~79세', '80~89세', '90~99세', '100세 이상'];

  return bands.map((band) => ({
    ageGroup: band.replace('세 이상', '+').replace('~', '-'),
    totalKey: `${prefix}_계_${band}`,
    maleKey: `${prefix}_남_${band}`,
    femaleKey: `${prefix}_여_${band}`,
  }));
}

function parseOfficialPopulationRows(rows: Row[], sourceMonth: string, districtName: string): PopulationStats[] {
  const totalKeys = [`${sourceMonth.slice(0, 4)}년${sourceMonth.slice(5, 7)}월_총인구수`];
  const householdKeys = [`${sourceMonth.slice(0, 4)}년${sourceMonth.slice(5, 7)}월_세대수`];
  const householdSizeKeys = [`${sourceMonth.slice(0, 4)}년${sourceMonth.slice(5, 7)}월_세대당 인구`];
  const maleKeys = [`${sourceMonth.slice(0, 4)}년${sourceMonth.slice(5, 7)}월_남자 인구수`];
  const femaleKeys = [`${sourceMonth.slice(0, 4)}년${sourceMonth.slice(5, 7)}월_여자 인구수`];

  return rows
    .filter((row) => isDistrictDongRow(getCell(row, ['행정구역']), districtName))
    .map((row) => ({
      dongName: extractDongName(getCell(row, ['행정구역']), districtName),
      totalPopulation: getNumber(row, totalKeys),
      malePopulation: getNumber(row, maleKeys),
      femalePopulation: getNumber(row, femaleKeys),
      households: getNumber(row, householdKeys),
      averageHouseholdSize: getNumber(row, householdSizeKeys),
      sourceMonth,
    }))
    .filter((item) => item.dongName);
}

function parseOfficialAgeRows(rows: Row[], sourceMonth: string, districtName: string): AgeGenderDataset['items'] {
  const prefix = `${sourceMonth.slice(0, 4)}년${sourceMonth.slice(5, 7)}월`;
  const bandKeys = buildAgeBandKeys(prefix);

  return rows
    .filter((row) => isDistrictDongRow(getCell(row, ['행정구역']), districtName))
    .map((row) => ({
      dongName: extractDongName(getCell(row, ['행정구역']), districtName),
      bands: bandKeys
        .map((band): AgeBandStats => {
          const male = parseNumber(row[band.maleKey]);
          const female = parseNumber(row[band.femaleKey]);
          const total = parseNumber(row[band.totalKey]) || male + female;
          return {
            ageGroup: band.ageGroup,
            male,
            female,
            total,
          };
        })
        .filter((band) => band.total > 0),
    }))
    .filter((item) => item.bands.length > 0);
}

function parseOfficialHouseholdCompositionRows(
  rows: Row[],
  sourceMonth: string,
  districtName: string,
): Map<string, HouseholdCompositionStats> {
  const prefix = `${sourceMonth.slice(0, 4)}년${sourceMonth.slice(5, 7)}월_`;
  const fiveOrMoreKeys = ['5인세대', '6인세대', '7인세대', '8인세대', '9인세대', '10인이상세대'].map(
    (suffix) => `${prefix}${suffix}`,
  );

  return new Map(
    rows
      .filter((row) => isDistrictDongRow(getCell(row, ['행정구역']), districtName))
      .map((row) => {
        const dongName = extractDongName(getCell(row, ['행정구역']), districtName);
        const composition: HouseholdCompositionStats = {
          totalHouseholds: getNumber(row, [`${prefix}전체세대`]),
          onePerson: getNumber(row, [`${prefix}1인세대`]),
          twoPerson: getNumber(row, [`${prefix}2인세대`]),
          threePerson: getNumber(row, [`${prefix}3인세대`]),
          fourPerson: getNumber(row, [`${prefix}4인세대`]),
          fiveOrMore: fiveOrMoreKeys.reduce((sum, key) => sum + getNumber(row, [key]), 0),
        };
        return [dongName, composition] as const;
      })
      .filter(([dongName]) => Boolean(dongName)),
  );
}

function toPopulationItem(row: Row, sourceMonth: string): PopulationStats {
  const totalPopulation = getNumber(row, ['총인구수', '총인구', 'population_total', 'totalPopulation']);
  const malePopulation = getNumber(row, ['남자인구수', '남성인구', 'malePopulation']);
  const femalePopulation = getNumber(row, ['여자인구수', '여성인구', 'femalePopulation']);
  const households = getNumber(row, ['세대수', 'households']);
  const averageHouseholdSize =
    getNumber(row, ['세대당인구', '평균세대원수', 'averageHouseholdSize']) ||
    (households > 0 ? Number((totalPopulation / households).toFixed(2)) : 0);

  return {
    dongName: normalizeDongName(getCell(row, ['행정동', '동명', 'adm_nm', 'dongName'])),
    totalPopulation,
    malePopulation,
    femalePopulation,
    households,
    averageHouseholdSize,
    areaKm2: getNumber(row, ['면적', 'area_km2']) || undefined,
    sourceMonth,
  };
}

function toHouseholdComposition(row: Row): HouseholdCompositionStats | undefined {
  const totalHouseholds = getNumber(row, ['전체세대', '세대수', 'totalHouseholds', 'households']);
  const onePerson = getNumber(row, ['1인가구', '1인세대', 'onePersonHouseholds']);
  const twoPerson = getNumber(row, ['2인가구', '2인세대', 'twoPersonHouseholds']);
  const threePerson = getNumber(row, ['3인가구', '3인세대', 'threePersonHouseholds']);
  const fourPerson = getNumber(row, ['4인가구', '4인세대', 'fourPersonHouseholds']);
  const fiveOrMore =
    getNumber(row, ['5인이상가구', '5인이상세대', 'fiveOrMoreHouseholds']) ||
    ['5인가구', '5인세대', '6인가구', '6인세대', '7인가구', '7인세대', '8인가구', '8인세대', '9인가구', '9인세대', '10인이상가구', '10인이상세대']
      .map((key) => getNumber(row, [key]))
      .reduce((sum, value) => sum + value, 0);

  if (totalHouseholds <= 0 && onePerson + twoPerson + threePerson + fourPerson + fiveOrMore <= 0) {
    return undefined;
  }

  return {
    totalHouseholds: totalHouseholds || onePerson + twoPerson + threePerson + fourPerson + fiveOrMore,
    onePerson,
    twoPerson,
    threePerson,
    fourPerson,
    fiveOrMore,
  };
}

function buildGenericAgeBands(row: Row): AgeBandStats[] {
  const definitions = [
    ['0-9', ['0_9_남', '0-9_남', 'age_0_9_male'], ['0_9_여', '0-9_여', 'age_0_9_female']],
    ['10-19', ['10_19_남', '10-19_남', 'age_10_19_male'], ['10_19_여', '10-19_여', 'age_10_19_female']],
    ['20-29', ['20_29_남', '20-29_남', 'age_20_29_male'], ['20_29_여', '20-29_여', 'age_20_29_female']],
    ['30-39', ['30_39_남', '30-39_남', 'age_30_39_male'], ['30_39_여', '30-39_여', 'age_30_39_female']],
    ['40-49', ['40_49_남', '40-49_남', 'age_40_49_male'], ['40_49_여', '40-49_여', 'age_40_49_female']],
    ['50-59', ['50_59_남', '50-59_남', 'age_50_59_male'], ['50_59_여', '50-59_여', 'age_50_59_female']],
    ['60-69', ['60_69_남', '60-69_남', 'age_60_69_male'], ['60_69_여', '60-69_여', 'age_60_69_female']],
    ['70+', ['70이상_남', '70+_남', 'age_70_plus_male'], ['70이상_여', '70+_여', 'age_70_plus_female']],
  ] as const;

  return definitions
    .map(([ageGroup, maleKeys, femaleKeys]) => {
      const male = getNumber(row, maleKeys);
      const female = getNumber(row, femaleKeys);
      return { ageGroup, male, female, total: male + female };
    })
    .filter((band) => band.total > 0);
}

async function main(): Promise<void> {
  const inputPath = getArg('--input');
  const ageInputPath = getArg('--age-input');
  const householdInputPath = getArg('--household-input');
  const outputPath = path.resolve(getArg('--output') ?? DEFAULT_OUTPUT);
  const ageOutputPath = path.resolve(getArg('--age-output') ?? DEFAULT_AGE_OUTPUT);
  const sheetName = getArg('--sheet');
  const ageSheetName = getArg('--age-sheet');
  const householdSheetName = getArg('--household-sheet');
  const sourceMonth = getArg('--month') ?? new Date().toISOString().slice(0, 7);
  const districtName = getArg('--district-name') ?? DEFAULT_DISTRICT;

  if (!inputPath) {
    throw new Error(
      '사용법: tsx scripts/prepare-population-data.ts --input raw.csv [--age-input raw-age.csv] [--household-input raw-household.csv] [--output public/data/population_by_dong.json]',
    );
  }

  const populationRows = await readRows(path.resolve(inputPath), sheetName);
  const ageRows = ageInputPath ? await readRows(path.resolve(ageInputPath), ageSheetName) : populationRows;
  const householdRows = householdInputPath ? await readRows(path.resolve(householdInputPath), householdSheetName) : [];

  const populationItems = (isOfficialPopulationRow(populationRows[0] ?? {})
    ? parseOfficialPopulationRows(populationRows, sourceMonth, districtName)
    : populationRows
        .map((row) => toPopulationItem(row, sourceMonth))
        .filter((item) => item.dongName))
    .map((item) => ({ ...item }));

  const householdCompositionByDong = householdRows.length
    ? isOfficialHouseholdCompositionRow(householdRows[0] ?? {})
      ? parseOfficialHouseholdCompositionRows(householdRows, sourceMonth, districtName)
      : new Map(
          householdRows
            .map((row) => ({
              dongName: normalizeDongName(getCell(row, ['행정동', '동명', 'adm_nm', 'dongName'])),
              composition: toHouseholdComposition(row),
            }))
            .filter((item): item is { dongName: string; composition: HouseholdCompositionStats } => Boolean(item.dongName && item.composition))
            .map((item) => [item.dongName, item.composition] as const),
        )
    : new Map<string, HouseholdCompositionStats>();

  populationItems.forEach((item) => {
    const composition = householdCompositionByDong.get(item.dongName);
    if (!composition) {
      return;
    }

    item.householdComposition = composition;
  });

  const ageGenderItems = isOfficialPopulationRow(ageRows[0] ?? {})
    ? parseOfficialAgeRows(ageRows, sourceMonth, districtName)
    : ageRows
        .map((row) => ({
          dongName: normalizeDongName(getCell(row, ['행정동', '동명', 'adm_nm', 'dongName'])),
          bands: buildGenericAgeBands(row),
        }))
        .filter((item) => item.dongName && item.bands.length > 0);

  const populationDataset: PopulationDataset = {
    updatedAt: sourceMonth,
    source: `변환 스크립트 생성 (${path.basename(inputPath)})`,
    items: populationItems,
  };

  const ageDataset: AgeGenderDataset = {
    updatedAt: sourceMonth,
    source: `변환 스크립트 생성 (${path.basename(ageInputPath ?? inputPath)})`,
    items: ageGenderItems,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(populationDataset, null, 2)}\n`, 'utf8');
  await writeFile(ageOutputPath, `${JSON.stringify(ageDataset, null, 2)}\n`, 'utf8');

  console.log(`인구 데이터 ${populationItems.length}건 저장: ${outputPath}`);
  console.log(`연령/성별 데이터 ${ageGenderItems.length}건 저장: ${ageOutputPath}`);
  if (householdCompositionByDong.size > 0) {
    console.log(`세대원별 세대구성 ${householdCompositionByDong.size}건 병합 완료`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
