import { ROUTES } from '@/config/routes'
import type { RegionSearchResult } from '@/types/search'

export const getRegionNavigationPath = (result: RegionSearchResult) => {
  if (result.adminLevel === 'province') {
    return ROUTES.province(result.provinceCode)
  }

  if (result.adminLevel === 'city') {
    return `${ROUTES.province(result.provinceCode)}?selectedCity=${result.adminCode}`
  }

  return `${ROUTES.city(result.provinceCode, result.cityCode ?? '')}?selectedTown=${result.adminCode}`
}
