import { SEOUL_OPEN_API_DEFAULT_BASE_DATE } from '../config/dataSource';
import type { DistrictPopulationStats, DongPopulationStats } from '../types';
import { normalizeRegionName, resolveDistrictCode, resolveDongCode } from '../utils/normalizeRegionCode';

export type UnknownRow = Record<string, unknown>;

const DISTRICT_AGE_FIELDS = [
  ['0-9', Array.from({ length: 10 }, (_, index) => `N_${index}SE`)],
  ['10-19', Array.from({ length: 10 }, (_, index) => `N_${index + 10}SE`)],
  ['20-29', Array.from({ length: 10 }, (_, index) => `N_${index + 20}SE`)],
  ['30-39', Array.from({ length: 10 }, (_, index) => `N_${index + 30}SE`)],
  ['40-49', Array.from({ length: 10 }, (_, index) => `N_${index + 40}SE`)],
  ['50-59', Array.from({ length: 10 }, (_, index) => `N_${index + 50}SE`)],
  ['60-69', Array.from({ length: 10 }, (_, index) => `N_${index + 60}SE`)],
  ['70-79', Array.from({ length: 10 }, (_, index) => `N_${index + 70}SE`)],
  ['80-89', Array.from({ length: 10 }, (_, index) => `N_${index + 80}SE`)],
  ['90-99', Array.from({ length: 10 }, (_, index) => `N_${index + 90}SE`)],
  ['100+', ['N_100SE_ISANG']],
] as const;

const DONG_AGE_FIELDS = [
  ['0-9', ['N_04SE', 'N_59SE']],
  ['10-19', ['N_1014SE', 'N_1519SE']],
  ['20-29', ['N_2024SE', 'N_2529SE']],
  ['30-39', ['N_3034SE', 'N_3539SE']],
  ['40-49', ['N_4044SE', 'N_4549SE']],
  ['50-59', ['N_5054SE', 'N_5559SE']],
  ['60-69', ['N_6064SE', 'N_6569SE']],
  ['70-79', ['N_7074SE', 'N_7579SE']],
  ['80-89', ['N_8084SE', 'N_8589SE']],
  ['90-99', ['N_9094SE', 'N_9599SE']],
  ['100+', ['N_100SE_ISANG']],
] as const;

export function resolvePopulationBaseDate(baseDate?: string): string {
  return baseDate?.trim() || SEOUL_OPEN_API_DEFAULT_BASE_DATE;
}

export function pickString(row: UnknownRow, keys: readonly string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return `${value}`.trim();
    }
  }

  return '';
}

export function pickNumber(row: UnknownRow, keys: readonly string[]): number {
  const raw = pickString(row, keys).replace(/,/g, '');
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function normalizeDistrictPopulationApiRows(
  populationRows: UnknownRow[],
  householdRows: UnknownRow[],
): DistrictPopulationStats[] {
  const items = new Map<string, DistrictPopulationStats>();

  for (const row of populationRows) {
    const districtName = pickString(row, ['GUBUN']);
    const districtCode = resolveDistrictCode('', districtName);
    if (!districtCode || isSubtotalName(districtName)) {
      continue;
    }

    const gender = normalizeGender(pickString(row, ['SEONGBYEOL']));
    const item = items.get(districtCode) || {
      districtCode,
      districtName,
      totalPopulation: 0,
      households: 0,
      ageGroups: DISTRICT_AGE_FIELDS.map(([label]) => ({ label, value: 0 })),
    };

    if (gender === 'all') {
      item.totalPopulation = pickNumber(row, ['GYE']);
      item.ageGroups = DISTRICT_AGE_FIELDS.map(([label, fields]) => ({
        label,
        value: fields.reduce((sum, field) => sum + pickNumber(row, [field]), 0),
      }));
    } else if (gender === 'male') {
      item.malePopulation = pickNumber(row, ['GYE']);
    } else if (gender === 'female') {
      item.femalePopulation = pickNumber(row, ['GYE']);
    }

    items.set(districtCode, item);
  }

  for (const row of householdRows) {
    const districtName = pickString(row, ['JACHIGU']);
    const districtCode = resolveDistrictCode('', districtName);
    const item = districtCode ? items.get(districtCode) : undefined;
    if (!item) {
      continue;
    }

    item.households = pickNumber(row, ['JEONCHESEDAE']);
  }

  return [...items.values()].sort((left, right) => left.districtCode.localeCompare(right.districtCode));
}

export function normalizeDongPopulationApiRows(
  populationRows: UnknownRow[],
  householdRows: UnknownRow[],
): DongPopulationStats[] {
  const items = new Map<string, DongPopulationStats>();

  for (const row of populationRows) {
    const districtName = pickString(row, ['JACHIGU']);
    const dongName = pickString(row, ['DONG']);
    const districtCode = resolveDistrictCode('', districtName);
    const dongCode = resolveDongCode('', districtCode, dongName);
    if (!districtCode || !dongCode || !dongName || isSubtotalName(dongName)) {
      continue;
    }

    const gender = normalizeGender(pickString(row, ['GUBUN']));
    const item = items.get(dongCode) || {
      districtCode,
      districtName,
      dongCode,
      dongName,
      totalPopulation: 0,
      households: 0,
      ageGroups: DONG_AGE_FIELDS.map(([label]) => ({ label, value: 0 })),
    };

    if (gender === 'all') {
      item.totalPopulation = pickNumber(row, ['GYE']);
      item.ageGroups = DONG_AGE_FIELDS.map(([label, fields]) => ({
        label,
        value: fields.reduce((sum, field) => sum + pickNumber(row, [field]), 0),
      }));
    } else if (gender === 'male') {
      item.malePopulation = pickNumber(row, ['GYE']);
    } else if (gender === 'female') {
      item.femalePopulation = pickNumber(row, ['GYE']);
    }

    items.set(dongCode, item);
  }

  for (const row of householdRows) {
    const districtName = pickString(row, ['JACHIGU']);
    const dongName = pickString(row, ['DONG']);
    const districtCode = resolveDistrictCode('', districtName);
    const dongCode = resolveDongCode('', districtCode, dongName);
    const item = dongCode ? items.get(dongCode) : undefined;
    if (!item) {
      continue;
    }

    item.households = pickNumber(row, ['JEONCHESEDAESU']);
  }

  return [...items.values()].sort((left, right) => {
    if (left.districtCode === right.districtCode) {
      return left.dongName.localeCompare(right.dongName, 'ko');
    }

    return left.districtCode.localeCompare(right.districtCode);
  });
}

function normalizeGender(value: string): 'all' | 'male' | 'female' | 'other' {
  const normalized = normalizeRegionName(value);
  if (!normalized || normalized === '계' || normalized === '총계' || normalized === '합계') {
    return 'all';
  }

  if (normalized.includes('남')) {
    return 'male';
  }

  if (normalized.includes('여')) {
    return 'female';
  }

  return 'other';
}

function isSubtotalName(value: string): boolean {
  const normalized = normalizeRegionName(value);
  return !normalized || normalized === '합계' || normalized === '총계' || normalized === '계' || normalized === '소계';
}
