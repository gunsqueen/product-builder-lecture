import districtsMock from '../data/mock/seoulDistricts.json';
import dongsMock from '../data/mock/seoulDongs.json';
import type { AreaLevel } from '../types';

const DISTRICT_NAME_TO_CODE = new Map(
  (districtsMock as Array<Record<string, unknown>>).map((item) => [normalizeRegionName(`${item.name}`), `${item.code}`]),
);

const DONG_NAME_TO_CODE = new Map(
  (dongsMock as Array<Record<string, unknown>>).map((item) => [
    `${item.districtCode}:${normalizeRegionName(`${item.name}`)}`,
    `${item.code}`,
  ]),
);

export function normalizeRegionCode(value: string | number | undefined, level: AreaLevel): string {
  const digits = `${value ?? ''}`.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (level === 'district') {
    return digits.slice(0, 5);
  }

  if (digits.length >= 10) {
    return digits.slice(0, 10);
  }

  return digits.length >= 8 ? digits.slice(0, 8) : digits;
}

export function normalizeRegionName(value: string | undefined): string {
  return `${value ?? ''}`
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/제(\d+)/g, '$1')
    .replace(/[()]/g, '')
    .trim();
}

export function resolveDistrictCode(code: string | number | undefined, districtName?: string): string {
  return normalizeRegionCode(code, 'district') || DISTRICT_NAME_TO_CODE.get(normalizeRegionName(districtName)) || '';
}

export function resolveDongCode(
  code: string | number | undefined,
  districtCode: string,
  dongName?: string,
): string {
  const normalized = normalizeRegionCode(code, 'dong');
  if (normalized) {
    return normalized;
  }

  const matched = DONG_NAME_TO_CODE.get(`${districtCode}:${normalizeRegionName(dongName)}`);
  if (matched) {
    return matched;
  }

  if (!districtCode || !dongName) {
    return '';
  }

  return buildSyntheticDongCode(districtCode, dongName);
}

export function buildSyntheticDongCode(districtCode: string, dongName: string): string {
  const normalizedName = normalizeRegionName(dongName);
  const hash = [...normalizedName].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return `${districtCode}${String(hash % 100000).padStart(5, '0')}`;
}
