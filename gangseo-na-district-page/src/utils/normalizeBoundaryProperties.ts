import { resolveDistrictCode, resolveDongCode } from './normalizeRegionCode';
import {
  AREA_FIELDS,
  DISTRICT_CODE_FIELDS,
  DISTRICT_NAME_FIELDS,
  DONG_CODE_FIELDS,
  DONG_NAME_FIELDS,
} from './regionMatchers';
import type { AreaLevel, GeoFeatureProperties, NormalizedBoundaryFeatureProperties } from '../types';

function pickValue(source: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return `${value}`.trim();
    }
  }

  return '';
}

function pickEntry(source: Record<string, unknown>, keys: readonly string[]): { key: string; value: string } | undefined {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return { key, value: `${value}`.trim() };
    }
  }

  return undefined;
}

function normalizeDongDisplayName(rawDongName: string, districtName: string): string {
  return rawDongName
    .replace(/^서울특별시\s*/u, '')
    .replace(new RegExp(`^${districtName}\\s*`, 'u'), '')
    .trim();
}

export function normalizeBoundaryProperties(
  properties: Record<string, unknown>,
  level: AreaLevel,
): NormalizedBoundaryFeatureProperties {
  const districtName = pickValue(properties, DISTRICT_NAME_FIELDS) || '이름 없음';
  const districtCode = resolveDistrictCode(
    pickValue(properties, DISTRICT_CODE_FIELDS) || pickValue(properties, ['district', 'sigungu']),
    districtName,
  );

  if (level === 'district') {
    return {
      districtCode,
      districtName,
      level,
      areaKm2: normalizeArea(properties),
      areaSource: normalizeArea(properties) !== undefined ? 'property' : undefined,
      centroid: normalizeCentroid(properties),
    };
  }

  const rawDongName = pickValue(properties, DONG_NAME_FIELDS);
  const dongName = normalizeDongDisplayName(rawDongName, districtName);

  return {
    districtCode,
    districtName,
    dongCode: resolveDongCode(pickValue(properties, DONG_CODE_FIELDS), districtCode, dongName || rawDongName),
    dongName,
    level,
    areaKm2: normalizeArea(properties),
    areaSource: normalizeArea(properties) !== undefined ? 'property' : undefined,
    centroid: normalizeCentroid(properties),
  };
}

function normalizeCentroid(properties: Record<string, unknown>): GeoFeatureProperties['centroid'] | undefined {
  const raw = properties.centroid;
  if (Array.isArray(raw) && raw.length >= 2) {
    const lng = Number(raw[0]);
    const lat = Number(raw[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat];
    }
  }

  return undefined;
}

function normalizeArea(properties: Record<string, unknown>): number | undefined {
  const entry = pickEntry(properties, AREA_FIELDS);
  if (!entry) {
    return undefined;
  }

  const numeric = Number(entry.value.replace(/,/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }

  if (entry.key.toLowerCase().includes('km2')) {
    return Number(numeric.toFixed(3));
  }

  return Number((numeric / 1_000_000).toFixed(3));
}
