import districtPopulationSnapshot from '../data/mock/districtPopulation.json';
import { getDataSourceMode, isRealApiConfigured, SEOUL_OPEN_API_SERVICES } from '../config/dataSource';
import type { DistrictPopulationStats, PopulationDataset } from '../types';
import { createMockMeta, createRealFallbackMeta, fetchSeoulOpenApiRows } from './fetchSeoulOpenApi';
import {
  normalizeDistrictPopulationApiRows,
  resolvePopulationBaseDate,
  type UnknownRow,
} from './seoulPopulationParsers';

interface FetchDistrictPopulationOptions {
  baseDate?: string;
}

export async function fetchDistrictPopulation(
  options: FetchDistrictPopulationOptions = {},
): Promise<PopulationDataset<DistrictPopulationStats>> {
  const mode = getDataSourceMode();
  const fallbackDataset = normalizeSnapshotDistrictPopulation();

  if (mode === 'mock') {
    return fallbackDataset;
  }

  if (!isRealApiConfigured(SEOUL_OPEN_API_SERVICES.districtPopulation)) {
    return {
      ...fallbackDataset,
      meta: createRealFallbackMeta(
        `서울 열린데이터광장 Open API (${SEOUL_OPEN_API_SERVICES.districtPopulation || 'service-not-set'})`,
        fallbackDataset.meta.dataUpdatedAt,
        'API 키 또는 자치구 인구 서비스명이 설정되지 않았습니다.',
      ),
    };
  }

  try {
    return await fetchRealDistrictPopulation(options);
  } catch (error) {
    return {
      ...fallbackDataset,
      meta: createRealFallbackMeta(
        `서울 열린데이터광장 Open API (${SEOUL_OPEN_API_SERVICES.districtPopulation}, ${SEOUL_OPEN_API_SERVICES.districtHouseholds})`,
        fallbackDataset.meta.dataUpdatedAt,
        error instanceof Error ? error.message : '실제 자치구 인구 API 호출 실패',
      ),
    };
  }
}

async function fetchRealDistrictPopulation(
  options: FetchDistrictPopulationOptions,
): Promise<PopulationDataset<DistrictPopulationStats>> {
  const baseDate = resolvePopulationBaseDate(options.baseDate);
  const [populationResult, householdResult] = await Promise.all([
    fetchSeoulOpenApiRows<UnknownRow>({
      serviceName: SEOUL_OPEN_API_SERVICES.districtPopulation,
      dataLabel: '서울시 자치구 인구',
      pathSegments: [baseDate],
    }),
    fetchSeoulOpenApiRows<UnknownRow>({
      serviceName: SEOUL_OPEN_API_SERVICES.districtHouseholds,
      dataLabel: '서울시 자치구 세대수',
      pathSegments: [baseDate],
    }),
  ]);

  const items = normalizeDistrictPopulationApiRows(populationResult.rows, householdResult.rows);
  if (!items.length) {
    throw new Error('실제 API 응답에서 자치구 인구 데이터가 비어 있습니다.');
  }

  const snapshotLookup = buildSnapshotLookup(normalizeSnapshotDistrictPopulation().items);
  const mergedItems = items.map((item) => {
    const snapshot = snapshotLookup.get(item.districtCode);
    return {
      ...item,
      averageHouseholdSize: item.averageHouseholdSize ?? snapshot?.averageHouseholdSize ?? (item.households > 0 ? item.totalPopulation / item.households : undefined),
      householdComposition: item.householdComposition ?? snapshot?.householdComposition,
    };
  });

  return {
    items: mergedItems,
    meta: {
      ...populationResult.meta,
      dataUpdatedAt: baseDate,
      sourceLabel: `서울 열린데이터광장 Open API (${SEOUL_OPEN_API_SERVICES.districtPopulation}, ${SEOUL_OPEN_API_SERVICES.districtHouseholds})`,
      endpoint: [populationResult.meta.endpoint, householdResult.meta.endpoint].filter(Boolean).join(' | '),
    },
  };
}

function normalizeSnapshotDistrictPopulation(): PopulationDataset<DistrictPopulationStats> {
  return {
    items: (districtPopulationSnapshot.items as Array<Record<string, unknown>>).map((item) => {
      const householdComposition = item.householdComposition as Record<string, unknown> | undefined;
      return {
        districtCode: `${item.districtCode}`,
        districtName: `${item.areaName}`,
        totalPopulation: Number(item.totalPopulation),
        households: Number(item.households),
        malePopulation: Number(item.malePopulation),
        femalePopulation: Number(item.femalePopulation),
        ageGroups: Array.isArray(item.ageGroups)
          ? item.ageGroups.map((group) => ({ label: `${group.label}`, value: Number(group.value) }))
          : [],
        averageHouseholdSize: item.averageHouseholdSize === undefined ? undefined : Number(item.averageHouseholdSize),
        householdComposition: householdComposition
          ? {
              totalHouseholds: Number(householdComposition.totalHouseholds),
              onePerson: Number(householdComposition.onePerson),
              twoPerson: Number(householdComposition.twoPerson),
              threePerson: Number(householdComposition.threePerson),
              fourPerson: Number(householdComposition.fourPerson),
              fiveOrMore: Number(householdComposition.fiveOrMore),
            }
          : undefined,
      };
    }),
    meta: createMockMeta('서울시 공식 인구 스냅샷 fallback', `${districtPopulationSnapshot.updatedAt}`),
  };
}

function buildSnapshotLookup(items: DistrictPopulationStats[]): Map<string, DistrictPopulationStats> {
  return new Map(items.map((item) => [item.districtCode, item]));
}
