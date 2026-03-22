import type { AdminCode, AdminLevel } from '@/types/admin'
import type { PopulationSourceType } from '@/types/population'
import type { ElectionSourceType } from '@/types/election'
import type { RegionSearchResult } from '@/types/search'

export type TimeSeriesMetricKey =
  | 'totalPopulation'
  | 'agingRate'
  | 'youth2039Rate'
  | 'turnoutRate'
  | 'firstSecondGap'

export type TimeSeriesSourceType = PopulationSourceType | ElectionSourceType
export type TimeSeriesDomain = 'population' | 'election'

export interface TimeSeriesPoint {
  adminCode: AdminCode
  adminLevel: AdminLevel
  metricKey: TimeSeriesMetricKey
  year: number
  value: number
  formattedValue: string
  sourceType: TimeSeriesSourceType
  sourceDate: string
}

export interface PopulationTimeSeries {
  adminCode: AdminCode
  adminLevel: AdminLevel
  metricKey: Extract<TimeSeriesMetricKey, 'totalPopulation' | 'agingRate' | 'youth2039Rate'>
  points: TimeSeriesPoint[]
}

export interface ElectionTimeSeries {
  adminCode: AdminCode
  adminLevel: AdminLevel
  metricKey: Extract<TimeSeriesMetricKey, 'turnoutRate' | 'firstSecondGap'>
  points: TimeSeriesPoint[]
}

export interface TimeSeriesComparisonResult {
  metricKey: TimeSeriesMetricKey
  regionA: RegionSearchResult
  regionB: RegionSearchResult
  seriesA: TimeSeriesPoint[]
  seriesB: TimeSeriesPoint[]
  sourceType: TimeSeriesSourceType
  sourceDate: string
}

export interface RawTimeSeriesInput {
  adminCode: string
  adminLevel?: string
  metricKey: TimeSeriesMetricKey
  year: number
  value: number
  formattedValue?: string
  sourceType?: TimeSeriesSourceType
  sourceDate?: string
}

