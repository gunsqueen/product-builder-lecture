import type { HouseholdComposition, PopulationMetrics } from '../types';

export function calculateHouseholdMetrics(
  totalPopulation: number,
  households: number,
  householdComposition?: HouseholdComposition,
): Pick<PopulationMetrics, 'averageHouseholdSize' | 'onePersonHouseholdRatio' | 'householdCompositionCoverageRatio'> {
  const averageHouseholdSize = households > 0 ? totalPopulation / households : undefined;
  const composedTotal = householdComposition ? sumHouseholdComposition(householdComposition) : 0;

  return {
    averageHouseholdSize,
    onePersonHouseholdRatio:
      householdComposition && householdComposition.totalHouseholds > 0
        ? householdComposition.onePerson / householdComposition.totalHouseholds
        : undefined,
    householdCompositionCoverageRatio:
      householdComposition && households > 0 && composedTotal > 0 ? composedTotal / households : undefined,
  };
}

export function sumHouseholdComposition(householdComposition: HouseholdComposition): number {
  return (
    householdComposition.onePerson +
    householdComposition.twoPerson +
    householdComposition.threePerson +
    householdComposition.fourPerson +
    householdComposition.fiveOrMore
  );
}
