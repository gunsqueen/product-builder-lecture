import { useMemo } from 'react';
import { useAsyncResource } from './useAsyncResource';
import { fetchElectionResults } from '../services/fetchElectionResults';
import { fetchDistrictList } from '../services/fetchDistrictList';
import type { DataSourceBadgeInfo, District, ElectionDataset, ResourceState } from '../types';

interface ElectionOverviewBundle {
  districts: District[];
  elections: ElectionDataset;
  sourceBadges: DataSourceBadgeInfo[];
}

const EMPTY_BUNDLE: ElectionOverviewBundle = {
  districts: [],
  elections: {
    items: [],
    meta: {
      requestedAt: '',
      sourceLabel: '',
      resolvedSource: 'mock',
      fallbackUsed: false,
    },
  },
  sourceBadges: [],
};

export function useElectionOverview(): ResourceState<ElectionOverviewBundle> {
  const state = useAsyncResource<ElectionOverviewBundle>(
    async () => {
      const [districts, elections] = await Promise.all([fetchDistrictList(), fetchElectionResults()]);
      return {
        districts,
        elections,
        sourceBadges: [
          {
            label: '선거',
            resolvedSource: elections.meta.resolvedSource,
            fallbackUsed: elections.meta.fallbackUsed,
            fallbackReason: elections.meta.fallbackReason,
            endpoint: elections.meta.endpoint,
          },
        ],
      };
    },
    EMPTY_BUNDLE,
    [],
  );

  return useMemo(() => state, [state]);
}
