import type { AdminCode, AdminLevel, CityCode, ProvinceCode, TownCode } from '@/types/admin'

export interface RegionSearchResult {
  adminCode: AdminCode
  adminLevel: AdminLevel
  name: string
  parentName?: string
  provinceCode: ProvinceCode
  cityCode?: CityCode
  townCode?: TownCode
}
