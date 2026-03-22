import type { AdminCode, AdminLevel, CityCode, ProvinceCode, TownCode } from './admin'

export interface SearchResultItem {
  adminCode: AdminCode
  adminLevel: AdminLevel
  name: string
  parentName: string
  provinceCode: ProvinceCode
  cityCode?: CityCode
  townCode?: TownCode
}
