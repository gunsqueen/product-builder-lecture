import districtsSnapshot from '../data/mock/seoulDistricts.json';
import type { District } from '../types';

export async function fetchDistrictList(): Promise<District[]> {
  return (districtsSnapshot as Array<Record<string, unknown>>).map((item) => ({
    districtCode: `${item.code}`,
    districtName: `${item.name}`,
    slug: `${item.slug}`,
    population: Number(item.population) || 0,
    households: Number(item.households) || 0,
    administrativeDongCount: Number(item.administrativeDongCount) || 0,
    areaKm2: item.areaKm2 === null || item.areaKm2 === undefined ? undefined : Number(item.areaKm2),
    areaSource: item.areaSource ? `${item.areaSource}` as District['areaSource'] : undefined,
    description: item.description ? `${item.description}` : undefined,
    centroid: Array.isArray(item.centroid)
      ? [Number((item.centroid as number[])[0]), Number((item.centroid as number[])[1])]
      : undefined,
  }));
}
