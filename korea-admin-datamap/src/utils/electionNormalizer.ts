import type { AdminCode, AdminLevel } from '@/types/admin'
import type {
  ElectionDefinition,
  ElectionResult,
  ElectionSourceType,
  RawElectionInput,
} from '@/types/election'
import { getAdminLevelFromCode } from '@/utils/adminCode'
import {
  logElectionRegionMappingFailure,
  mapElectionRegionToAdminCode,
} from '@/utils/electionRegionMapper'

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

const toElectionType = (value?: string | null) => {
  if (
    value === 'presidential' ||
    value === 'national-assembly' ||
    value === 'local-governor' ||
    value === 'local-mayor' ||
    value === 'local-council' ||
    value === 'by-election' ||
    value === 'mock'
  ) {
    return value
  }

  return 'mock'
}

const resolveAdminLevel = (
  adminCode: AdminCode,
  adminLevel?: string | null,
): AdminLevel => {
  if (adminLevel === 'province' || adminLevel === 'city' || adminLevel === 'town') {
    return adminLevel
  }

  return getAdminLevelFromCode(adminCode)
}

export const normalizeElectionRecord = (
  input: RawElectionInput,
  sourceType: ElectionSourceType,
): ElectionResult | null => {
  const mappedAdminCode =
    (input.adminCode as AdminCode | undefined) ??
    mapElectionRegionToAdminCode({
      adminLevel:
        input.adminLevel === 'province' ||
        input.adminLevel === 'city' ||
        input.adminLevel === 'town'
          ? input.adminLevel
          : undefined,
      regionName: input.regionName,
      provinceName: input.provinceName,
      cityName: input.cityName,
      townName: input.townName,
    })

  if (!mappedAdminCode) {
    logElectionRegionMappingFailure({
      adminLevel:
        input.adminLevel === 'province' ||
        input.adminLevel === 'city' ||
        input.adminLevel === 'town'
          ? input.adminLevel
          : undefined,
      regionName: input.regionName,
      provinceName: input.provinceName,
      cityName: input.cityName,
      townName: input.townName,
    })
    return null
  }

  return {
    electionId: input.electionId,
    electionName: input.electionName ?? input.electionId,
    electionType: toElectionType(input.electionType),
    electionDate: input.electionDate ?? '1970-01-01',
    regionName: input.regionName ?? input.cityName ?? input.provinceName ?? '',
    adminCode: mappedAdminCode,
    adminLevel: resolveAdminLevel(mappedAdminCode, input.adminLevel),
    candidateName: input.candidateName ?? '알수없음',
    partyName: input.partyName ?? '무소속',
    voteCount: toNumber(input.voteCount),
    voteRate: toNumber(input.voteRate),
    totalValidVotes: toNumber(input.totalValidVotes),
    totalVotes: toNumber(input.totalVotes),
    turnoutRate: toNumber(input.turnoutRate),
    sourceType,
    sourceDate: input.sourceDate ?? '1970-01-01',
  }
}

export const normalizeElectionCollection = (
  inputs: RawElectionInput[],
  sourceType: ElectionSourceType,
) =>
  inputs
    .map((input) => normalizeElectionRecord(input, sourceType))
    .filter((record): record is ElectionResult => Boolean(record))

export const listAvailableElectionDefinitions = (
  results: ElectionResult[],
): ElectionDefinition[] => {
  const definitionMap = new Map<string, ElectionDefinition>()

  results.forEach((result) => {
    if (!definitionMap.has(result.electionId)) {
      definitionMap.set(result.electionId, {
        electionId: result.electionId,
        electionName: result.electionName,
        electionType: result.electionType,
        electionDate: result.electionDate,
        sourceType: result.sourceType,
      })
    }
  })

  return [...definitionMap.values()].sort((left, right) =>
    right.electionDate.localeCompare(left.electionDate),
  )
}

export const getTopElectionResult = (results: ElectionResult[]) =>
  [...results].sort((left, right) => right.voteRate - left.voteRate)[0] ?? null
