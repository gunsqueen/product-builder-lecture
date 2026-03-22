import type { AdminCode, AdminLevel } from '@/types/admin'

export type PopulationSourceType = 'mock' | 'snapshot' | 'real'

export interface PopulationStats {
  adminCode: AdminCode
  adminLevel: AdminLevel
  totalPopulation: number
  householdCount: number
  malePopulation: number
  femalePopulation: number
  age0to9: number
  age10to19: number
  age20to29: number
  age30to39: number
  age40to49: number
  age50to59: number
  age60to64: number
  age65plus: number
  sourceType: PopulationSourceType
  sourceDate: string
  daytimePopulation?: number
}

export interface RawPopulationInput {
  adminCode: string
  adminLevel?: string
  totalPopulation?: number | string | null
  householdCount?: number | string | null
  malePopulation?: number | string | null
  femalePopulation?: number | string | null
  age0to9?: number | string | null
  age10to19?: number | string | null
  age20to29?: number | string | null
  age30to39?: number | string | null
  age40to49?: number | string | null
  age50to59?: number | string | null
  age60to64?: number | string | null
  age65plus?: number | string | null
  sourceDate?: string | null
  daytimePopulation?: number | string | null
}

export interface PopulationJoinRecord {
  adminCode: AdminCode
  adminLevel: AdminLevel
}
