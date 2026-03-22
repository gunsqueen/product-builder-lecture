import type { AdminCode, AdminLevel } from '@/types/admin'
import {
  getAvailableElections as listAvailableElectionDefinitions,
  getDefaultElectionForLevel,
  getElectionResults as getElectionResultsByLevel,
  getElectionResultsByAdminCode,
  getElectionSummaryByAdminCode,
} from '@/services/electionService'

export const getElectionResults = (
  level: AdminLevel,
  electionId?: string,
) => getElectionResultsByLevel(level, electionId)

export const getElectionResultByCode = (
  adminCode: AdminCode,
  electionId: string,
) => getElectionSummaryByAdminCode(adminCode, electionId)

export const getElectionResultsForAdminCode = (
  adminCode: AdminCode,
  electionId: string,
) => getElectionResultsByAdminCode(adminCode, electionId)

export const listAvailableElections = () => listAvailableElectionDefinitions()

export const getDefaultElectionId = (level: AdminLevel) =>
  getDefaultElectionForLevel(level)
