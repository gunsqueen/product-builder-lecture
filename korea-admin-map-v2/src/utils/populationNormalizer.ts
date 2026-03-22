import type { PopulationStats } from '../types/population'
import { getAdminLevel } from './adminCode'
import {
  calculateAge0to14,
  calculateAge15to64,
  calculateAgingRatio,
  calculateSeniorPopulation,
  calculateYouthPopulation,
  calculateYouthRatio,
} from './populationMetrics'

const emptyDistribution = () => [] as PopulationStats['ageDistribution']
const emptyHouseholdDistribution = () => [] as PopulationStats['householdSizeDistribution']

const numberValue = (value: string | number | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return value ? Number(String(value).replaceAll(',', '').trim()) || 0 : 0
}

const withDerivedStats = (record: Omit<PopulationStats, 'youthRatio' | 'agingRatio' | 'youthPopulation' | 'seniorPopulation'>): PopulationStats => {
  const age0to14 = record.ageDistribution.length > 0 ? calculateAge0to14(record.ageDistribution) : record.age0to14
  const age15to64 = record.ageDistribution.length > 0 ? calculateAge15to64(record.ageDistribution) : record.age15to64
  const seniorPopulation = record.ageDistribution.length > 0 ? calculateSeniorPopulation(record.ageDistribution) : record.age65plus
  const youthPopulation = record.ageDistribution.length > 0 ? calculateYouthPopulation(record.ageDistribution) : 0

  return {
    ...record,
    age0to14,
    age15to64,
    age65plus: seniorPopulation,
    youthPopulation,
    seniorPopulation,
    youthRatio: record.ageDistribution.length > 0 ? calculateYouthRatio(youthPopulation, record.totalPopulation) : null,
    agingRatio: record.ageDistribution.length > 0 ? calculateAgingRatio(seniorPopulation, record.totalPopulation) : null,
  }
}

export const normalizePopulationRecord = (input: {
  adminCode: string
  totalPopulation: string | number
  householdCount: string | number
  malePopulation: string | number
  femalePopulation: string | number
  age0to14?: string | number
  age15to64?: string | number
  age65plus?: string | number
  ageDistribution?: PopulationStats['ageDistribution']
  householdSizeDistribution?: PopulationStats['householdSizeDistribution']
  ageDistributionSourceType?: PopulationStats['ageDistributionSourceType']
  householdSizeSourceType?: PopulationStats['householdSizeSourceType']
  sourceType: 'real' | 'snapshot' | 'mock'
  sourceDate: string
}): PopulationStats => {
  const age0to14 = numberValue(input.age0to14)
  const age15to64 = numberValue(input.age15to64)
  const age65plus = numberValue(input.age65plus)

  return withDerivedStats(
    {
      adminCode: input.adminCode,
      adminLevel: getAdminLevel(input.adminCode),
      totalPopulation: numberValue(input.totalPopulation),
      householdCount: numberValue(input.householdCount),
      malePopulation: numberValue(input.malePopulation),
      femalePopulation: numberValue(input.femalePopulation),
      age0to14,
      age15to64,
      age65plus,
      ageDistribution: input.ageDistribution ?? emptyDistribution(),
      householdSizeDistribution: input.householdSizeDistribution ?? emptyHouseholdDistribution(),
      ageDistributionSourceType: input.ageDistributionSourceType,
      householdSizeSourceType: input.householdSizeSourceType,
      sourceType: input.sourceType,
      sourceDate: input.sourceDate,
    },
  )
}
