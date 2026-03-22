import type { AdminCode } from '@/types/admin'
import {
  getCityPopulation,
  getPopulationByAdminCode,
  getPopulationStats,
  getProvincePopulation,
  getTownPopulation,
} from '@/services/populationService'

export { getPopulationStats }

export const getPopulationByCode = (adminCode: AdminCode) =>
  getPopulationByAdminCode(adminCode)

export const getProvincePopulationByCode = (provinceCode: AdminCode) =>
  getProvincePopulation(provinceCode)

export const getCityPopulationByCode = (cityCode: AdminCode) =>
  getCityPopulation(cityCode)

export const getTownPopulationByCode = (townCode: AdminCode) =>
  getTownPopulation(townCode)
