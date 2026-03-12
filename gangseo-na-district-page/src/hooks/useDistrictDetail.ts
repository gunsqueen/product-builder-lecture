import { useMemo } from 'react';
import { useAsyncResource } from './useAsyncResource';
import { fetchElectionResults } from '../services/fetchElectionResults';
import { fetchDistrictGeoBoundary, fetchDongGeoBoundary } from '../services/fetchGeoBoundary';
import { fetchDistrictPopulation } from '../services/fetchDistrictPopulation';
import { fetchDongPopulation } from '../services/fetchDongPopulation';
import { fetchDistrictList } from '../services/fetchDistrictList';
import { fetchDongList } from '../services/fetchDongList';
import {
  filterGeoFeaturesByDistrict,
  getDistrictByCode,
  getDistrictPopulationByCode,
  getDongsByDistrict,
  getDongByCode,
  getDongPopulationByCode,
  getDongPopulationByDistrict,
  getElectionResultsForScope,
} from '../utils/codeMapping';
import { joinElectionToGeo } from '../utils/joinElectionToGeo';
import { joinPopulationToGeo } from '../utils/joinPopulationToGeo';
import { buildAreaStatsLookup } from '../utils/calculateArea';
import { validateElectionJoin } from '../utils/validateElectionJoin';
import { logFocusDistrictSummary, logFocusElectionSummary, logFocusPopulationMetrics, validateGeoJoin, validateSeoulDistrictShape } from '../utils/validateGeoJoin';
import type {
  BoundaryDataset,
  DataSourceBadgeInfo,
  DistrictDetailModel,
  ElectionDataset,
  ElectionResult,
  JoinedBoundaryFeature,
  ResourceState,
} from '../types';
import type { DongPopulationStats, PopulationDataset } from '../types';

interface DistrictDetailState {
  detail?: DistrictDetailModel;
  districtBoundaries: BoundaryDataset;
  dongBoundaries: BoundaryDataset;
  joinedDongFeatures: JoinedBoundaryFeature[];
  districtPopulationDataset: PopulationDataset<DongPopulationStats>;
  elections: ElectionDataset;
  sourceBadges: DataSourceBadgeInfo[];
}

const EMPTY_DATASET = {
  items: [],
  meta: {
    requestedAt: '',
    sourceLabel: '',
    resolvedSource: 'mock' as const,
    fallbackUsed: false,
  },
};

const EMPTY_STATE: DistrictDetailState = {
  detail: undefined,
  districtBoundaries: {
    geojson: { type: 'FeatureCollection', features: [] },
    meta: EMPTY_DATASET.meta,
  },
  dongBoundaries: {
    geojson: { type: 'FeatureCollection', features: [] },
    meta: EMPTY_DATASET.meta,
  },
  joinedDongFeatures: [],
  districtPopulationDataset: EMPTY_DATASET,
  elections: {
    items: [],
    meta: EMPTY_DATASET.meta,
  },
  sourceBadges: [],
};

export function useDistrictDetail(districtCode?: string): ResourceState<DistrictDetailState> {
  const state = useAsyncResource<DistrictDetailState>(
    async () => {
      const [districts, districtPopulation, dongs, dongPopulation, elections, districtBoundaries, dongBoundaries] = await Promise.all([
        fetchDistrictList(),
        fetchDistrictPopulation(),
        fetchDongList(),
        fetchDongPopulation(),
        fetchElectionResults(),
        fetchDistrictGeoBoundary(),
        fetchDongGeoBoundary(),
      ]);

      const dongCountByDistrict = new Map<string, number>();
      for (const dong of dongs) {
        dongCountByDistrict.set(dong.districtCode, (dongCountByDistrict.get(dong.districtCode) || 0) + 1);
      }
      const districtAreaLookup = buildAreaStatsLookup(districtBoundaries.geojson, 'district');
      const dongAreaLookup = buildAreaStatsLookup(dongBoundaries.geojson, 'dong');

      const enrichedDistricts = districts.map((district) => {
        const population = districtPopulation.items.find((item) => item.districtCode === district.districtCode);
        const area = districtAreaLookup.get(district.districtCode);
        return {
          ...district,
          population: population?.totalPopulation ?? district.population,
          households: population?.households ?? district.households,
          administrativeDongCount: dongCountByDistrict.get(district.districtCode) ?? district.administrativeDongCount,
          areaKm2: district.areaKm2 ?? area?.areaKm2,
          areaSource: district.areaSource ?? area?.areaSource,
        };
      });

      const district = getDistrictByCode(enrichedDistricts, districtCode);
      const filteredDistrictGeo = {
        ...districtBoundaries,
        geojson: {
          ...districtBoundaries.geojson,
          features: districtBoundaries.geojson.features.filter((feature) => feature.properties.districtCode === districtCode),
        },
      };
      const filteredDongGeo = {
        ...dongBoundaries,
        geojson: filterGeoFeaturesByDistrict(dongBoundaries.geojson, districtCode),
      };

      const districtElectionResults = getElectionResultsForScope(elections.items, districtCode, 'district');
      const districtDongPopulation = getDongPopulationByDistrict(dongPopulation.items, districtCode);
      const joinedDongFeatures = joinElectionToGeo(
        joinPopulationToGeo(filteredDongGeo.geojson, districtDongPopulation, 'dong'),
        elections.items.filter((item) => item.scopeLevel === 'dong' && item.districtCode === districtCode && item.electionId === 'presidential-2025'),
        'dong',
      ).map((item) => ({
        ...item,
        area: item.feature.properties.dongCode ? dongAreaLookup.get(item.feature.properties.dongCode) : undefined,
      }));
      const enrichedDongs = getDongsByDistrict(dongs, districtCode).map((dong) => {
        const area = dongAreaLookup.get(dong.dongCode);
        return {
          ...dong,
          areaKm2: dong.areaKm2 ?? area?.areaKm2,
          areaSource: dong.areaSource ?? area?.areaSource,
        };
      });

      validateSeoulDistrictShape(enrichedDistricts, dongs);
      if (district) {
        validateGeoJoin(joinedDongFeatures, districtDongPopulation, 'dong', `${district.districtName} 행정동`);
        validateElectionJoin(
          enrichedDongs.map((item) => item.dongCode),
          elections.items.filter((item) => item.scopeLevel === 'dong' && item.districtCode === districtCode && item.electionId === 'presidential-2025'),
          'dong',
          `${district.districtName} 행정동 선거`,
        );
        logFocusDistrictSummary(enrichedDistricts, dongs, districtPopulation.items);
        logFocusPopulationMetrics(districtPopulation.items);
        logFocusElectionSummary(elections.items);
      }

      return {
        detail: district
          ? {
              district,
              population: getDistrictPopulationByCode(districtPopulation.items, districtCode),
              dongs: enrichedDongs,
              dongPopulation: districtDongPopulation,
              districtElectionResults,
            }
          : undefined,
        districtBoundaries: filteredDistrictGeo,
        dongBoundaries: filteredDongGeo,
        joinedDongFeatures,
        districtPopulationDataset: dongPopulation,
        elections,
        sourceBadges: [
          toBadge('인구', districtPopulation.meta),
          toBadge('행정동 인구', dongPopulation.meta),
          toBadge('선거', elections.meta),
          toBadge('경계', filteredDongGeo.meta),
        ],
      };
    },
    EMPTY_STATE,
    [districtCode],
  );

  return useMemo(() => state, [state]);
}

export function useDongDetail(districtCode?: string, dongCode?: string) {
  const state = useAsyncResource(
    async () => {
      const [districts, dongs, dongPopulation, elections, dongBoundaries] = await Promise.all([
        fetchDistrictList(),
        fetchDongList(),
        fetchDongPopulation(),
        fetchElectionResults(),
        fetchDongGeoBoundary(),
      ]);
      const dongAreaLookup = buildAreaStatsLookup(dongBoundaries.geojson, 'dong');
      const enrichedDistricts = districts.map((district) => district);
      const enrichedDongs = dongs.map((dong) => {
        const area = dongAreaLookup.get(dong.dongCode);
        return {
          ...dong,
          areaKm2: dong.areaKm2 ?? area?.areaKm2,
          areaSource: dong.areaSource ?? area?.areaSource,
        };
      });

      return {
        district: getDistrictByCode(enrichedDistricts, districtCode),
        dong: getDongByCode(enrichedDongs, dongCode),
        population: getDongPopulationByCode(dongPopulation.items, dongCode),
        elections: getElectionResultsForScope(elections.items, dongCode, 'dong'),
        sourceBadges: [
          toBadge('행정동 인구', dongPopulation.meta),
          toBadge('선거', elections.meta),
          toBadge('경계', dongBoundaries.meta),
        ],
      };
    },
    {
      district: undefined,
      dong: undefined,
      population: undefined,
      elections: [] as ElectionResult[],
      sourceBadges: [] as DataSourceBadgeInfo[],
    },
    [districtCode, dongCode],
  );

  return useMemo(() => state, [state]);
}

function toBadge(
  label: string,
  meta: { resolvedSource: 'mock' | 'real'; fallbackUsed: boolean; fallbackReason?: string; endpoint?: string },
): DataSourceBadgeInfo {
  return {
    label,
    resolvedSource: meta.resolvedSource,
    fallbackUsed: meta.fallbackUsed,
    fallbackReason: meta.fallbackReason,
    endpoint: meta.endpoint,
  };
}
