import dongsSnapshot from '../data/mock/seoulDongs.json';
import type { Dong } from '../types';

export async function fetchDongList(): Promise<Dong[]> {
  return (dongsSnapshot as Array<Record<string, unknown>>).map((item) => ({
    dongCode: `${item.code}`,
    districtCode: `${item.districtCode}`,
    districtName: `${item.districtName}`,
    dongName: `${item.name}`,
    areaKm2: item.areaKm2 === null || item.areaKm2 === undefined ? undefined : Number(item.areaKm2),
    areaSource: item.areaSource ? `${item.areaSource}` as Dong['areaSource'] : undefined,
    centroid: Array.isArray(item.centroid)
      ? [Number((item.centroid as number[])[0]), Number((item.centroid as number[])[1])]
      : undefined,
    description: item.description ? `${item.description}` : undefined,
  }));
}
