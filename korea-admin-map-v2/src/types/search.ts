import type { AdminLevel } from './admin'

export interface SearchRegionResult {
  adminCode: string
  adminLevel: AdminLevel
  name: string
  parentName?: string
  provinceCode: string
  cityCode?: string
  townCode?: string
  route: string
  keywords: string[]
}
