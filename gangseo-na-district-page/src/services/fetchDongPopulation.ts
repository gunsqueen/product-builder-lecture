import dongPopulationSnapshot from '../data/mock/dongPopulation.json';
import districtsSnapshot from '../data/mock/seoulDistricts.json';
import { getDataSourceMode, isRealApiConfigured, SEOUL_OPEN_API_SERVICES } from '../config/dataSource';
import type { DongPopulationStats, PopulationDataset } from '../types';
import { createMockMeta, createRealFallbackMeta, fetchSeoulOpenApiRows } from './fetchSeoulOpenApi';
import {
  normalizeDongPopulationApiRows,
  resolvePopulationBaseDate,
  type UnknownRow,
} from './seoulPopulationParsers';

interface FetchDongPopulationOptions {
  baseDate?: string;
}

export async function fetchDongPopulation(
  options: FetchDongPopulationOptions = {},
): Promise<PopulationDataset<DongPopulationStats>> {
  const mode = getDataSourceMode();
  const fallbackDataset = normalizeSnapshotDongPopulation();

  if (mode === 'mock') {
    return fallbackDataset;
  }

  if (!isRealApiConfigured(SEOUL_OPEN_API_SERVICES.dongPopulation)) {
    return {
      ...fallbackDataset,
      meta: createRealFallbackMeta(
        `서울 열린데이터광장 Open API (${SEOUL_OPEN_API_SERVICES.dongPopulation || 'service-not-set'})`,
        fallbackDataset.meta.dataUpdatedAt,
        'API 키 또는 행정동 인구 서비스명이 설정되지 않았습니다.',
      ),
    };
  }

  try {
    return await fetchRealDongPopulation(options);
  } catch (error) {
    return {
      ...fallbackDataset,
      meta: createRealFallbackMeta(
        `서울 열린데이터광장 Open API (${SEOUL_OPEN_API_SERVICES.dongPopulation}, ${SEOUL_OPEN_API_SERVICES.dongHouseholds})`,
        fallbackDataset.meta.dataUpdatedAt,
        error instanceof Error ? error.message : '실제 행정동 인구 API 호출 실패',
      ),
    };
  }
}

async function fetchRealDongPopulation(
  options: FetchDongPopulationOptions,
): Promise<PopulationDataset<DongPopulationStats>> {
  const baseDate = resolvePopulationBaseDate(options.baseDate);
  const [populationResult, householdResult] = await Promise.all([
    fetchSeoulOpenApiRows<UnknownRow>({
      serviceName: SEOUL_OPEN_API_SERVICES.dongPopulation,
      dataLabel: '서울시 행정동 인구',
      pathSegments: [baseDate],
    }),
    fetchSeoulOpenApiRows<UnknownRow>({
      serviceName: SEOUL_OPEN_API_SERVICES.dongHouseholds,
      dataLabel: '서울시 행정동 세대수',
      pathSegments: [baseDate],
    }),
  ]);

  const items = normalizeDongPopulationApiRows(populationResult.rows, householdResult.rows);
  if (!items.length) {
    throw new Error('실제 API 응답에서 행정동 인구 데이터가 비어 있습니다.');
  }

  const snapshotLookup = buildSnapshotLookup(normalizeSnapshotDongPopulation().items);
  const mergedItems = items.map((item) => {
    const snapshot = snapshotLookup.get(item.dongCode);
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
      sourceLabel: `서울 열린데이터광장 Open API (${SEOUL_OPEN_API_SERVICES.dongPopulation}, ${SEOUL_OPEN_API_SERVICES.dongHouseholds})`,
      endpoint: [populationResult.meta.endpoint, householdResult.meta.endpoint].filter(Boolean).join(' | '),
    },
  };
}

function normalizeSnapshotDongPopulation(): PopulationDataset<DongPopulationStats> {
  const districtNameByCode = new Map(
    (districtsSnapshot as Array<Record<string, unknown>>).map((item) => [`${item.code}`, `${item.name}`]),
  );

  return {
    items: (dongPopulationSnapshot.items as Array<Record<string, unknown>>).map((item) => {
      const householdComposition = item.householdComposition as Record<string, unknown> | undefined;
      return {
        districtCode: `${item.districtCode}`,
        districtName: districtNameByCode.get(`${item.districtCode}`) || '',
        dongCode: `${item.areaCode}`,
        dongName: `${item.areaName}`,
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
    meta: createMockMeta('서울시 공식 행정동 인구 스냅샷 fallback', `${dongPopulationSnapshot.updatedAt}`),
  };
}

function buildSnapshotLookup(items: DongPopulationStats[]): Map<string, DongPopulationStats> {
  return new Map(items.map((item) => [item.dongCode, item]));
}
