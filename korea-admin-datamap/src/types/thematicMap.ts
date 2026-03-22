import type { AdminCode, AdminLevel } from '@/types/admin'
import type { BoundarySourceType } from '@/types/boundary'

export type ThematicMetricKey =
  | 'totalPopulation'
  | 'householdCount'
  | 'agingRate'
  | 'youth2039Rate'
  | 'turnoutRate'
  | 'topCandidateVoteRate'
  | 'topPartyVoteRate'

export type ThematicMetricDomain = 'population' | 'election'
export type ColorScaleMethod = 'quantile' | 'equalInterval'

export interface LegendRange {
  color: string
  min: number
  max: number
  label: string
}

export interface ThematicMetricDefinition {
  key: ThematicMetricKey
  label: string
  description: string
  sourceDomain: ThematicMetricDomain
  formatter: (value: number | null) => string
  defaultColorScale: string[]
  scaleMethod: ColorScaleMethod
}

export interface ThematicMapMetricItem {
  metricKey: ThematicMetricKey
  metricLabel: string
  adminCode: AdminCode
  adminLevel: AdminLevel
  value: number | null
  formattedValue: string
  colorClass: string
  sourceType: BoundarySourceType
  sourceDate: string
}

export interface ThematicMapResult {
  metricKey: ThematicMetricKey
  metricLabel: string
  description: string
  adminLevel: AdminLevel
  items: ThematicMapMetricItem[]
  lookup: Record<AdminCode, ThematicMapMetricItem>
  legendRanges: LegendRange[]
  noDataColor: string
  sourceDomain: ThematicMetricDomain
  sourceType: BoundarySourceType
  sourceDate: string
  missingPopulationCodes: string[]
  missingElectionCodes: string[]
  calculationUnavailableCodes: string[]
}
