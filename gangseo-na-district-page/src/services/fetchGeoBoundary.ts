import type { FeatureCollection, Geometry } from 'geojson';
import { getDataSourceMode } from '../config/dataSource';
import type { AreaLevel, BoundaryCollection, BoundaryDataset, NormalizedBoundaryFeatureProperties } from '../types';
import { normalizeBoundaryProperties } from '../utils/normalizeBoundaryProperties';
import { createMockMeta, createRealFallbackMeta } from './fetchSeoulOpenApi';

const DISTRICT_GEO_SNAPSHOT_URL = new URL('../data/geo/seoulDistricts.geojson', import.meta.url).href;
const DONG_GEO_SNAPSHOT_URL = new URL('../data/geo/seoulDongs.geojson', import.meta.url).href;
const DISTRICT_GEO_SNAPSHOT_SIMPLIFIED_URL = new URL('../data/geo/seoulDistricts.simplified.geojson', import.meta.url).href;
const DONG_GEO_SNAPSHOT_SIMPLIFIED_URL = new URL('../data/geo/seoulDongs.simplified.geojson', import.meta.url).href;

interface FetchGeoBoundaryOptions {
  level: AreaLevel;
  simplified?: boolean;
}

export async function fetchDistrictGeoBoundary(options: { simplified?: boolean } = {}): Promise<BoundaryDataset> {
  return fetchGeoBoundary({ level: 'district', simplified: options.simplified });
}

export async function fetchDongGeoBoundary(options: { simplified?: boolean } = {}): Promise<BoundaryDataset> {
  return fetchGeoBoundary({ level: 'dong', simplified: options.simplified });
}

export async function fetchGeoBoundary({ level, simplified = true }: FetchGeoBoundaryOptions): Promise<BoundaryDataset> {
  const mode = getDataSourceMode();
  const fallbackUrl = getFallbackGeoUrl(level, simplified);
  const realUrl = getRealGeoUrl(level, simplified);

  if (mode === 'mock') {
    return loadFallbackBoundaryDataset(level, fallbackUrl);
  }

  if (!realUrl) {
    const fallback = await loadFallbackBoundaryDataset(level, fallbackUrl);
    return {
      ...fallback,
      meta: createRealFallbackMeta(
        `외부 GeoJSON (${level})`,
        fallback.meta.dataUpdatedAt,
        '실제 GeoJSON URL이 설정되지 않았습니다.',
      ),
    };
  }

  try {
    const realBoundary = await loadBoundaryUrl(level, realUrl);
    return {
      geojson: realBoundary,
      meta: {
        requestedAt: new Date().toISOString(),
        sourceLabel: `외부 GeoJSON (${realUrl})`,
        resolvedSource: 'real',
        fallbackUsed: false,
        endpoint: realUrl,
      },
    };
  } catch (error) {
    const fallback = await loadFallbackBoundaryDataset(level, fallbackUrl);
    return {
      ...fallback,
      meta: createRealFallbackMeta(
        `외부 GeoJSON (${realUrl})`,
        fallback.meta.dataUpdatedAt,
        error instanceof Error ? error.message : '경계 GeoJSON 로드 실패',
      ),
    };
  }
}

async function loadFallbackBoundaryDataset(level: AreaLevel, url: string): Promise<BoundaryDataset> {
  return {
    geojson: await loadBoundaryUrl(level, url),
    meta: createMockMeta(level === 'district' ? '서울시 자치구 공식 스냅샷 경계' : '서울시 행정동 공식 스냅샷 경계', '2026-02-01'),
  };
}

async function loadBoundaryUrl(level: AreaLevel, url: string): Promise<BoundaryCollection> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`경계 파일 요청 실패: ${response.status}`);
  }

  const raw = (await response.json()) as FeatureCollection<Geometry, Record<string, unknown>>;
  return normalizeBoundaryCollection(raw, level);
}

function normalizeBoundaryCollection(
  raw: FeatureCollection<Geometry, Record<string, unknown>>,
  level: AreaLevel,
): BoundaryCollection {
  return {
    type: 'FeatureCollection',
    features: raw.features
      .filter(
        (feature): feature is FeatureCollection<Geometry, Record<string, unknown>>['features'][number] & {
          geometry: BoundaryCollection['features'][number]['geometry'];
        } => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon',
      )
      .map((feature) => ({
        type: 'Feature',
        properties: normalizeBoundaryProperties(
          (feature.properties ?? {}) as Record<string, unknown>,
          level,
        ) as NormalizedBoundaryFeatureProperties,
        geometry: feature.geometry,
      })),
  };
}

function getFallbackGeoUrl(level: AreaLevel, simplified: boolean): string {
  if (level === 'district') {
    return simplified ? DISTRICT_GEO_SNAPSHOT_SIMPLIFIED_URL : DISTRICT_GEO_SNAPSHOT_URL;
  }

  return simplified ? DONG_GEO_SNAPSHOT_SIMPLIFIED_URL : DONG_GEO_SNAPSHOT_URL;
}

function getRealGeoUrl(level: AreaLevel, simplified: boolean): string {
  if (level === 'district') {
    return simplified
      ? import.meta.env.VITE_DISTRICT_GEO_SIMPLIFIED_URL?.trim() || import.meta.env.VITE_DISTRICT_GEO_URL?.trim() || ''
      : import.meta.env.VITE_DISTRICT_GEO_URL?.trim() || '';
  }

  return simplified
    ? import.meta.env.VITE_DONG_GEO_SIMPLIFIED_URL?.trim() || import.meta.env.VITE_DONG_GEO_URL?.trim() || ''
    : import.meta.env.VITE_DONG_GEO_URL?.trim() || '';
}
