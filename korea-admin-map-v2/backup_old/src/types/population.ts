import type { AdminCode, AdminLevel } from './admin'
import type { SourceType } from '../config/app'

export interface PopulationStats {
  adminCode: AdminCode
  adminLevel: AdminLevel
  totalPopulation: number
  householdCount: number
  malePopulation: number
  femalePopulation: number
  age0to14: number
  age15to64: number
  age65plus: number
  youthRatio: number
  agingRatio: number
  sourceType: SourceType
  sourceDate: string
}
