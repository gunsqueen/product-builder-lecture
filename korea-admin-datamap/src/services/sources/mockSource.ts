import {
  getMockCities,
  getMockCityByCode,
  getMockElectionResultByCode,
  getMockElectionResults,
  getMockPopulationByCode,
  getMockPopulationStats,
  getMockProvinceByCode,
  getMockProvinces,
  getMockTownByCode,
  getMockTowns,
} from '@/data/mock'
import {
  loadCityBoundaryCollection,
  loadProvinceBoundaryCollection,
  loadTownBoundaryCollection,
} from '@/data/geo/loaders'
import type { AdminDataSource } from '@/services/sources/types'

export const mockSource: AdminDataSource = {
  name: 'mock',
  async getProvinces() {
    return getMockProvinces()
  },
  async getProvinceByCode(provinceCode) {
    return getMockProvinceByCode(provinceCode)
  },
  async getCities(provinceCode) {
    return getMockCities(provinceCode)
  },
  async getCityByCode(cityCode) {
    return getMockCityByCode(cityCode)
  },
  async getTowns(cityCode) {
    return getMockTowns(cityCode)
  },
  async getTownByCode(townCode) {
    return getMockTownByCode(townCode)
  },
  async getPopulationStats(level, parentCode) {
    return getMockPopulationStats(level, parentCode)
  },
  async getPopulationByCode(adminCode) {
    return getMockPopulationByCode(adminCode)
  },
  async getElectionResults(level, parentCode) {
    return getMockElectionResults(level, parentCode)
  },
  async getElectionResultByCode(adminCode) {
    return getMockElectionResultByCode(adminCode)
  },
  async getProvinceBoundaries() {
    return loadProvinceBoundaryCollection()
  },
  async getCityBoundaries(provinceCode) {
    return loadCityBoundaryCollection(provinceCode)
  },
  async getTownBoundaries(cityCode) {
    return loadTownBoundaryCollection(cityCode)
  },
}
