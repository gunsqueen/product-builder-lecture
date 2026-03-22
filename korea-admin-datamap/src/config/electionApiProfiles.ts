import { loadCityByCode, loadProvinceByCode, loadTownByCode } from '@/services/adminService'
import type { AdminCode, AdminLevel } from '@/types/admin'
import type { ElectionType } from '@/types/election'
import {
  getAdminLevelFromCode,
  getCityCodeFromTown,
  getProvinceCodeFromAdminCode,
} from '@/utils/adminCode'

type ElectionApiLevel = Exclude<AdminLevel, 'town'> | 'district'

export interface ElectionApiProfile {
  electionId: string
  electionCode: string
  year: string
  level: ElectionApiLevel
  sgId: string
  sgTypecode: string
  electionName: string
  electionDate: string
  electionType: ElectionType
  supportsRealApi: boolean
}

export interface ResolvedElectionApiRequest extends ElectionApiProfile {
  query: Record<string, string>
}

const ELECTION_API_PROFILES: Record<string, ElectionApiProfile> = {
  '2025-presidential': {
    electionId: '2025-presidential',
    electionCode: 'presidential',
    year: '2025',
    level: 'province',
    sgId: '20250603',
    sgTypecode: '1',
    electionName: '제21대 대통령선거',
    electionDate: '2025-06-03',
    electionType: 'presidential',
    supportsRealApi: true,
  },
  '2026-local-governor': {
    electionId: '2026-local-governor',
    electionCode: 'local-governor',
    year: '2026',
    level: 'province',
    sgId: '20260603',
    sgTypecode: '3',
    electionName: '2026 지방선거 광역단체장',
    electionDate: '2026-06-03',
    electionType: 'local-governor',
    supportsRealApi: true,
  },
  '2026-local-mayor': {
    electionId: '2026-local-mayor',
    electionCode: 'local-mayor',
    year: '2026',
    level: 'city',
    sgId: '20260603',
    sgTypecode: '4',
    electionName: '2026 지방선거 기초단체장',
    electionDate: '2026-06-03',
    electionType: 'local-mayor',
    supportsRealApi: true,
  },
  '2024-national-assembly': {
    electionId: '2024-national-assembly',
    electionCode: 'national-assembly',
    year: '2024',
    level: 'district',
    sgId: '20240410',
    sgTypecode: '2',
    electionName: '제22대 국회의원선거',
    electionDate: '2024-04-10',
    electionType: 'national-assembly',
    supportsRealApi: true,
  },
  '2026-local-town': {
    electionId: '2026-local-town',
    electionCode: 'local-town-snapshot',
    year: '2026',
    level: 'city',
    sgId: '20260603',
    sgTypecode: '4',
    electionName: '2026 지방선거 행정동 샘플',
    electionDate: '2026-06-03',
    electionType: 'mock',
    supportsRealApi: false,
  },
}

export const getElectionApiProfile = (electionId: string) =>
  ELECTION_API_PROFILES[electionId] ?? null

export const listElectionApiProfiles = () => Object.values(ELECTION_API_PROFILES)

export const resolveElectionApiRequest = async (
  electionId: string,
  adminCode?: AdminCode,
): Promise<ResolvedElectionApiRequest | null> => {
  const profile = getElectionApiProfile(electionId)

  if (!profile || !profile.supportsRealApi) {
    return null
  }

  const query: Record<string, string> = {
    sgId: profile.sgId,
    sgTypecode: profile.sgTypecode,
    resultType: 'json',
    pageNo: '1',
    numOfRows: '500',
  }

  if (!adminCode) {
    return {
      ...profile,
      query,
    }
  }

  const adminLevel = getAdminLevelFromCode(adminCode)
  const provinceCode = getProvinceCodeFromAdminCode(adminCode)
  const province = await loadProvinceByCode(provinceCode)

  if (province) {
    query.sdName = province.name
  }

  if (adminLevel === 'city') {
    const city = await loadCityByCode(adminCode)

    if (city) {
      query.wiwName = city.name
      query.sggName = city.name
    }
  }

  if (adminLevel === 'town') {
    const town = await loadTownByCode(adminCode)
    const city = await loadCityByCode(getCityCodeFromTown(adminCode))

    if (city) {
      query.wiwName = city.name
      query.sggName = city.name
    }

    if (town) {
      query.emdName = town.name
    }
  }

  return {
    ...profile,
    query,
  }
}
