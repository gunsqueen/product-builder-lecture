import type { AdminLevel } from './admin'
import type { SourceType } from '../config/app'

export interface DistributionItem {
  label: string
  value: number
}

export interface PopulationStats {
  adminCode: string
  adminLevel: AdminLevel
  totalPopulation: number
  householdCount: number
  malePopulation: number
  femalePopulation: number
  age0to14: number
  age15to64: number
  age65plus: number
  ageDistribution: DistributionItem[]
  youthPopulation: number
  seniorPopulation: number
  youthRatio: number | null
  agingRatio: number | null
  householdSizeDistribution: DistributionItem[]
  ageDistributionSourceType?: SourceType
  householdSizeSourceType?: SourceType
  sourceType: SourceType
  sourceDate: string
}
