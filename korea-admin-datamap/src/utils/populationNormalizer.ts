import type { AdminCode, AdminLevel } from '@/types/admin'
import type {
  PopulationSourceType,
  PopulationStats,
  RawPopulationInput,
} from '@/types/population'
import { getAdminLevelFromCode } from '@/utils/adminCode'

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const numeric = Number(value.replaceAll(',', ''))
    return Number.isFinite(numeric) ? numeric : 0
  }

  return 0
}

const resolveAdminLevel = (adminCode: AdminCode, level?: string): AdminLevel => {
  if (level === 'province' || level === 'city' || level === 'town') {
    return level
  }

  return getAdminLevelFromCode(adminCode)
}

export const normalizePopulationRecord = (
  input: RawPopulationInput,
  sourceType: PopulationSourceType,
): PopulationStats => {
  const adminCode = input.adminCode as AdminCode
  const totalPopulation = toNumber(input.totalPopulation)
  const malePopulation = toNumber(input.malePopulation)
  const femalePopulation = toNumber(input.femalePopulation)
  const fallbackHalf = Math.round(totalPopulation / 2)
  const resolvedMalePopulation = malePopulation || fallbackHalf
  const resolvedFemalePopulation =
    femalePopulation || Math.max(0, totalPopulation - resolvedMalePopulation)

  return {
    adminCode,
    adminLevel: resolveAdminLevel(adminCode, input.adminLevel),
    totalPopulation,
    householdCount: toNumber(input.householdCount),
    malePopulation: resolvedMalePopulation,
    femalePopulation: resolvedFemalePopulation,
    age0to9: toNumber(input.age0to9),
    age10to19: toNumber(input.age10to19),
    age20to29: toNumber(input.age20to29),
    age30to39: toNumber(input.age30to39),
    age40to49: toNumber(input.age40to49),
    age50to59: toNumber(input.age50to59),
    age60to64: toNumber(input.age60to64),
    age65plus: toNumber(input.age65plus),
    sourceType,
    sourceDate: input.sourceDate ?? '1970-01-01',
    daytimePopulation: toNumber(input.daytimePopulation) || undefined,
  }
}

export const normalizePopulationCollection = (
  inputs: RawPopulationInput[],
  sourceType: PopulationSourceType,
) => inputs.map((input) => normalizePopulationRecord(input, sourceType))

export const getSeniorRatio = (record: PopulationStats) =>
  record.totalPopulation > 0
    ? (record.age65plus / record.totalPopulation) * 100
    : 0

export const getYoungAdultRatio = (record: PopulationStats) =>
  record.totalPopulation > 0
    ? ((record.age20to29 + record.age30to39) / record.totalPopulation) * 100
    : 0

export const getSexRatio = (record: PopulationStats) =>
  record.femalePopulation > 0
    ? (record.malePopulation / record.femalePopulation) * 100
    : 0
