import type { PopulationStats } from '../types/population'
import { getAdminLevel } from './adminCode'

const numberValue = (value: string | number | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return value ? Number(String(value).replaceAll(',', '').trim()) || 0 : 0
}

const withRatios = (record: Omit<PopulationStats, 'youthRatio' | 'agingRatio'>): PopulationStats => ({
  ...record,
  youthRatio: record.totalPopulation > 0 ? (record.age15to64 / record.totalPopulation) * 100 : 0,
  agingRatio: record.totalPopulation > 0 ? (record.age65plus / record.totalPopulation) * 100 : 0,
})

export const normalizePopulationRecord = (input: {
  adminCode: string
  totalPopulation: string | number
  householdCount: string | number
  malePopulation: string | number
  femalePopulation: string | number
  age0to14?: string | number
  age15to64?: string | number
  age65plus?: string | number
  sourceType: 'real' | 'snapshot' | 'mock'
  sourceDate: string
}): PopulationStats =>
  withRatios({
    adminCode: input.adminCode,
    adminLevel: getAdminLevel(input.adminCode),
    totalPopulation: numberValue(input.totalPopulation),
    householdCount: numberValue(input.householdCount),
    malePopulation: numberValue(input.malePopulation),
    femalePopulation: numberValue(input.femalePopulation),
    age0to14: numberValue(input.age0to14),
    age15to64: numberValue(input.age15to64),
    age65plus: numberValue(input.age65plus),
    sourceType: input.sourceType,
    sourceDate: input.sourceDate,
  })

export const scaleAgeBuckets = (record: PopulationStats, profile?: { age0to14: number; age15to64: number; age65plus: number }) => {
  if (!profile) return record
  const total = profile.age0to14 + profile.age15to64 + profile.age65plus
  if (total <= 0 || record.totalPopulation <= 0) return record
  return withRatios({
    ...record,
    age0to14: Math.round((record.totalPopulation * profile.age0to14) / total),
    age15to64: Math.round((record.totalPopulation * profile.age15to64) / total),
    age65plus: Math.round((record.totalPopulation * profile.age65plus) / total),
  })
}
