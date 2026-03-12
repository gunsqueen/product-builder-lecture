import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { AreaLevel, AreaStats, BoundaryCollection, BoundaryFeature } from '../types';
import { normalizeRegionCode } from './normalizeRegionCode';

const EARTH_RADIUS_METERS = 6378137;
const EXPLICIT_AREA_KEYS = [
  'areaKm2',
  'area_km2',
  'AREA_KM2',
  'area',
  'AREA',
  'shape_area',
  'Shape_Area',
  'SHAPE_AREA',
  'ALAND',
] as const;

export function calculateAreaStats(feature: BoundaryFeature): AreaStats {
  const regionCode = normalizeRegionCode(
    feature.properties.level === 'district' ? feature.properties.districtCode : feature.properties.dongCode,
    feature.properties.level,
  );
  const regionName = feature.properties.level === 'district' ? feature.properties.districtName : feature.properties.dongName || '';
  const explicitArea = getExplicitAreaKm2(feature);

  if (explicitArea !== undefined) {
    return {
      regionCode,
      regionName,
      level: feature.properties.level,
      areaKm2: explicitArea,
      areaSource: 'property',
    };
  }

  const geometryAreaKm2 = calculateGeometryAreaKm2(feature);
  if (geometryAreaKm2 !== undefined) {
    return {
      regionCode,
      regionName,
      level: feature.properties.level,
      areaKm2: geometryAreaKm2,
      areaSource: 'geometry',
    };
  }

  return {
    regionCode,
    regionName,
    level: feature.properties.level,
    areaKm2: undefined,
    areaSource: 'none',
  };
}

export function buildAreaStatsLookup(
  geojson: BoundaryCollection,
  level: AreaLevel,
): Map<string, AreaStats> {
  return new Map(
    geojson.features.map((feature) => {
      const stats = calculateAreaStats(feature);
      return [normalizeRegionCode(stats.regionCode, level), stats] as const;
    }),
  );
}

export function calculateGeometryAreaKm2(feature: Feature<Polygon | MultiPolygon>): number | undefined {
  if (!feature.geometry) {
    return undefined;
  }

  let areaSquareMeters = 0;
  if (feature.geometry.type === 'Polygon') {
    areaSquareMeters = polygonArea(feature.geometry.coordinates);
  } else if (feature.geometry.type === 'MultiPolygon') {
    areaSquareMeters = feature.geometry.coordinates.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
  }

  if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) {
    return undefined;
  }

  return Number((areaSquareMeters / 1_000_000).toFixed(3));
}

function getExplicitAreaKm2(feature: BoundaryFeature): number | undefined {
  const properties = feature.properties as unknown as Record<string, unknown>;
  for (const key of EXPLICIT_AREA_KEYS) {
    const raw = properties[key];
    if (raw === undefined || raw === null || `${raw}`.trim() === '') {
      continue;
    }

    const value = Number(`${raw}`.replace(/,/g, '').trim());
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    if (key.toLowerCase().includes('km2')) {
      return Number(value.toFixed(3));
    }

    // Many GIS exports expose square meters in Shape_Area/ALAND style fields.
    return Number((value / 1_000_000).toFixed(3));
  }

  return undefined;
}

function polygonArea(rings: number[][][]): number {
  if (!rings.length) {
    return 0;
  }

  const outerArea = Math.abs(ringArea(rings[0]));
  const holesArea = rings.slice(1).reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0);
  return Math.max(outerArea - holesArea, 0);
}

function ringArea(coordinates: number[][]): number {
  const coordinateCount = coordinates.length;
  if (coordinateCount < 3) {
    return 0;
  }

  let area = 0;
  for (let index = 0; index < coordinateCount; index += 1) {
    const lower = coordinates[index];
    const middle = coordinates[(index + 1) % coordinateCount];
    const upper = coordinates[(index + 2) % coordinateCount];
    if (!lower || !middle || !upper) {
      continue;
    }

    area += (toRadians(upper[0]) - toRadians(lower[0])) * Math.sin(toRadians(middle[1]));
  }

  return Math.abs((area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
