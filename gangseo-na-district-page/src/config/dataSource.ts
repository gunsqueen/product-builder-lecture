import type { DataSourceMode } from '../types';

export const SEOUL_OPEN_API_BASE_URL =
  import.meta.env.VITE_SEOUL_OPEN_API_BASE_URL?.trim() || 'http://openapi.seoul.go.kr:8088';

export const SEOUL_OPEN_API_PAGE_SIZE = 1000;
export const SEOUL_OPEN_API_DEFAULT_SERVICES = {
  districtPopulation: 'octastatapi10719',
  districtHouseholds: 'octastatapi10930',
  dongPopulation: 'octastatapi10738',
  dongHouseholds: 'octastatapi10592',
} as const;
export const SEOUL_OPEN_API_DEFAULT_BASE_DATE =
  import.meta.env.VITE_SEOUL_POPULATION_BASE_DATE?.trim() || `${new Date().getFullYear() - 1}`;

// 서울시 주민등록연앙인구(연령별) 통계는 동 단위 원천 데이터를 제공한다.
// 자치구 통계는 동일 서비스를 합산해서 생성한다.
export const SEOUL_OPEN_API_SERVICES = {
  districtPopulation:
    import.meta.env.VITE_SEOUL_DISTRICT_POPULATION_SERVICE?.trim() || SEOUL_OPEN_API_DEFAULT_SERVICES.districtPopulation,
  districtHouseholds:
    import.meta.env.VITE_SEOUL_DISTRICT_HOUSEHOLD_SERVICE?.trim() || SEOUL_OPEN_API_DEFAULT_SERVICES.districtHouseholds,
  dongPopulation:
    import.meta.env.VITE_SEOUL_DONG_POPULATION_SERVICE?.trim() || SEOUL_OPEN_API_DEFAULT_SERVICES.dongPopulation,
  dongHouseholds:
    import.meta.env.VITE_SEOUL_DONG_HOUSEHOLD_SERVICE?.trim() || SEOUL_OPEN_API_DEFAULT_SERVICES.dongHouseholds,
} as const;

export function getDataSourceMode(): DataSourceMode {
  const rawMode = import.meta.env.VITE_DATA_SOURCE_MODE?.trim();
  if (rawMode === 'mock' || rawMode === 'real' || rawMode === 'auto') {
    return rawMode;
  }

  return 'auto';
}

export function getSeoulOpenApiKey(): string {
  return import.meta.env.VITE_SEOUL_OPEN_API_KEY?.trim() || '';
}

export function isRealApiConfigured(serviceName?: string): boolean {
  return Boolean(getSeoulOpenApiKey() && serviceName && serviceName.trim());
}
