import { useMemo } from 'react';
import { useAsyncResource } from './useAsyncResource';
import { fetchElectionResults } from '../services/fetchElectionResults';
import { fetchDistrictGeoBoundary } from '../services/fetchGeoBoundary';
import { fetchDistrictList } from '../services/fetchDistrictList';
import { fetchDongList } from '../services/fetchDongList';
import { fetchDistrictPopulation } from '../services/fetchDistrictPopulation';
import type { BoundaryDataset, DataSourceBadgeInfo, District, ElectionDataset, JoinedBoundaryFeature, PopulationDataset, ResourceState } from '../types';
import type { DistrictPopulationStats } from '../types';
import { buildAreaStatsLookup } from '../utils/calculateArea';
import { joinElectionToGeo } from '../utils/joinElectionToGeo';
import { joinPopulationToGeo } from '../utils/joinPopulationToGeo';
import { validateElectionJoin } from '../utils/validateElectionJoin';
import { logFocusDistrictSummary, logFocusElectionSummary, logFocusPopulationMetrics, validateGeoJoin, validateSeoulDistrictShape } from '../utils/validateGeoJoin';

interface DistrictIndexBundle {
  districts: District[];
  dongsCount: number;
  districtPopulation: PopulationDataset<DistrictPopulationStats>;
  elections: ElectionDataset;
  districtBoundaries: BoundaryDataset;
  joinedDistrictFeatures: JoinedBoundaryFeature[];
  sourceBadges: DataSourceBadgeInfo[];
}

const EMPTY_BUNDLE: DistrictIndexBundle = {
  districts: [],
  dongsCount: 0,
  districtPopulation: {
    items: [],
    meta: {
      requestedAt: '',
      sourceLabel: '',
      resolvedSource: 'mock',
      fallbackUsed: false,
    },
  },
  elections: {
    items: [],
    meta: {
      requestedAt: '',
      sourceLabel: '',
      resolvedSource: 'mock',
      fallbackUsed: false,
    },
  },
  districtBoundaries: {
    geojson: { type: 'FeatureCollection', features: [] },
    meta: {
      requestedAt: '',
      sourceLabel: '',
      resolvedSource: 'mock',
      fallbackUsed: false,
    },
  },
  joinedDistrictFeatures: [],
  sourceBadges: [],
};

export function useDistrictIndexData(): ResourceState<DistrictIndexBundle> {
  const state = useAsyncResource<DistrictIndexBundle>(
    async () => {
      const [districts, dongs, districtPopulation, elections, districtBoundaries] = await Promise.all([
        fetchDistrictList(),
        fetchDongList(),
        fetchDistrictPopulation(),
        fetchElectionResults(),
        fetchDistrictGeoBoundary(),
      ]);

      const dongCountByDistrict = new Map<string, number>();
      for (const dong of dongs) {
        dongCountByDistrict.set(dong.districtCode, (dongCountByDistrict.get(dong.districtCode) || 0) + 1);
      }
      const districtAreaLookup = buildAreaStatsLookup(districtBoundaries.geojson, 'district');

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

      const joinedPopulation = joinPopulationToGeo(districtBoundaries.geojson, districtPopulation.items, 'district');
      const joinedDistrictFeatures = joinElectionToGeo(
        joinedPopulation,
        elections.items.filter((item) => item.scopeLevel === 'district' && item.electionId === 'presidential-2025'),
        'district',
      );

      validateSeoulDistrictShape(enrichedDistricts, dongs);
      validateGeoJoin(joinedDistrictFeatures, districtPopulation.items, 'district', '서울시 자치구');
      validateElectionJoin(
        enrichedDistricts.map((item) => item.districtCode),
        elections.items.filter((item) => item.scopeLevel === 'district' && item.electionId === 'presidential-2025'),
        'district',
        '서울시 자치구 선거',
      );
      logFocusDistrictSummary(enrichedDistricts, dongs, districtPopulation.items);
      logFocusPopulationMetrics(districtPopulation.items);
      logFocusElectionSummary(elections.items);

      return {
        districts: enrichedDistricts,
        dongsCount: dongs.length,
        districtPopulation,
        elections,
        districtBoundaries,
        joinedDistrictFeatures,
        sourceBadges: [
          toBadge('인구', districtPopulation.meta),
          toBadge('선거', elections.meta),
          toBadge('경계', districtBoundaries.meta),
        ],
      };
    },
    EMPTY_BUNDLE,
    [],
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
