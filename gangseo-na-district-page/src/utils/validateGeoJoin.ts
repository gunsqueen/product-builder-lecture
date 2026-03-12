import type {
  AreaLevel,
  District,
  DistrictPopulationStats,
  Dong,
  DongPopulationStats,
  ElectionResult,
  JoinedBoundaryFeature,
  RegionJoinResult,
} from '../types';
import { calculateAgeRatioMetrics } from './ageMetrics';
import { calculateHouseholdMetrics, sumHouseholdComposition } from './householdMetrics';
import { normalizeRegionCode } from './normalizeRegionCode';

export function validateGeoJoin(
  items: JoinedBoundaryFeature[],
  populationItems: Array<DistrictPopulationStats | DongPopulationStats>,
  level: AreaLevel,
  scopeLabel: string,
): RegionJoinResult {
  const boundaryCodes = new Set(
    items.map((item) =>
      normalizeRegionCode(item.feature.properties.dongCode ?? item.feature.properties.districtCode, level),
    ),
  );
  const populationCodes = new Set(
    populationItems.map((item) =>
      normalizeRegionCode(level === 'district' ? item.districtCode : (item as DongPopulationStats).dongCode, level),
    ),
  );

  const unmatchedBoundaryCodes = [...boundaryCodes].filter((code) => !items.find((item) => {
    const itemCode = normalizeRegionCode(
      item.feature.properties.dongCode ?? item.feature.properties.districtCode,
      level,
    );
    return itemCode === code && item.population;
  }));
  const unmatchedPopulationCodes = [...populationCodes].filter((code) => !boundaryCodes.has(code));

  const result: RegionJoinResult = {
    scopeLabel,
    level,
    boundaryCount: items.length,
    matchedCount: items.filter((item) => Boolean(item.population)).length,
    unmatchedBoundaryCodes,
    unmatchedPopulationCodes,
  };

  const summary = `${scopeLabel}: ${result.matchedCount}/${result.boundaryCount} matched`;
  if (result.unmatchedBoundaryCodes.length || result.unmatchedPopulationCodes.length) {
    console.warn(`[validateGeoJoin] ${summary}`, result);
  } else {
    console.info(`[validateGeoJoin] ${summary}`);
  }

  return result;
}

export function validateSeoulDistrictShape(districts: District[], dongs: Dong[]) {
  if (districts.length !== 25) {
    console.warn(`[validateGeoJoin] 서울시 자치구 수가 25가 아닙니다: ${districts.length}`);
  } else {
    console.info('[validateGeoJoin] 서울시 자치구 수 검증 통과: 25');
  }

  const counts = new Map<string, number>();
  for (const dong of dongs) {
    counts.set(dong.districtCode, (counts.get(dong.districtCode) || 0) + 1);
  }

  for (const district of districts) {
    const count = counts.get(district.districtCode) || 0;
    if (count < 10) {
      console.warn(`[validateGeoJoin] ${district.districtName} 행정동 수가 낮습니다: ${count}`);
    }
  }
}

export function logFocusDistrictSummary(
  districts: District[],
  dongs: Dong[],
  districtPopulation: DistrictPopulationStats[],
  focusNames: string[] = ['강서구', '마포구', '송파구'],
) {
  const rows = focusNames.map((name) => {
    const district = districts.find((item) => item.districtName === name);
    const population = districtPopulation.find((item) => item.districtName === name);
    return {
      districtName: name,
      districtCode: district?.districtCode ?? 'missing',
      administrativeDongCount: dongs.filter((item) => item.districtName === name).length,
      totalPopulation: population?.totalPopulation ?? 0,
      households: population?.households ?? 0,
    };
  });

  console.table(rows);
}

export function logFocusPopulationMetrics(
  districtPopulation: DistrictPopulationStats[],
  focusNames: string[] = ['강서구', '마포구', '송파구'],
) {
  const rows = focusNames.map((name) => {
    const population = districtPopulation.find((item) => item.districtName === name);
    const ageMetrics = population ? calculateAgeRatioMetrics(population.ageGroups, population.totalPopulation) : {};
    const householdMetrics = population
      ? calculateHouseholdMetrics(population.totalPopulation, population.households, population.householdComposition)
      : {};

    return {
      districtName: name,
      totalPopulation: population?.totalPopulation ?? 0,
      households: population?.households ?? 0,
      ratio2030: ageMetrics.age2030Ratio ? `${(ageMetrics.age2030Ratio * 100).toFixed(2)}%` : '-',
      ratio10to19: ageMetrics.age10to19Ratio ? `${(ageMetrics.age10to19Ratio * 100).toFixed(2)}%` : '-',
      ratio65Plus: ageMetrics.senior65Ratio ? `${(ageMetrics.senior65Ratio * 100).toFixed(2)}%` : '-',
      onePersonRatio: householdMetrics.onePersonHouseholdRatio ? `${(householdMetrics.onePersonHouseholdRatio * 100).toFixed(2)}%` : '-',
      householdCoverage:
        householdMetrics.householdCompositionCoverageRatio
          ? `${(householdMetrics.householdCompositionCoverageRatio * 100).toFixed(2)}%`
          : '-',
      householdCompositionTotal: population?.householdComposition ? sumHouseholdComposition(population.householdComposition) : 0,
    };
  });

  console.table(rows);
}

export function logFocusElectionSummary(
  elections: ElectionResult[],
  focusCodes: string[] = ['11500', '11440', '11710'],
) {
  const rows = focusCodes.map((scopeCode) => {
    const latest = elections
      .filter((item) => item.scopeLevel === 'district' && item.scopeCode === scopeCode)
      .sort((left, right) => right.electionYear - left.electionYear)[0];

    return {
      scopeCode,
      scopeName: latest?.scopeName ?? 'missing',
      election: latest?.electionName ?? 'missing',
      turnout: latest ? `${(latest.turnout * 100).toFixed(2)}%` : '-',
      winner: latest?.results[0]?.label ?? '-',
    };
  });

  console.table(rows);
}
