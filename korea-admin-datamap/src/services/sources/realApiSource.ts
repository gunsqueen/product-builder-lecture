import { snapshotSource } from '@/services/sources/snapshotSource'
import type { AdminDataSource } from '@/services/sources/types'

let hasWarned = false

const warnFallback = () => {
  if (!hasWarned) {
    console.warn(
      '[source:real] real API adapter is not configured yet. Falling back to snapshot source.',
    )
    hasWarned = true
  }
}

export const realApiSource: AdminDataSource = {
  name: 'real',
  async getProvinces() {
    warnFallback()
    return snapshotSource.getProvinces()
  },
  async getProvinceByCode(provinceCode) {
    warnFallback()
    return snapshotSource.getProvinceByCode(provinceCode)
  },
  async getCities(provinceCode) {
    warnFallback()
    return snapshotSource.getCities(provinceCode)
  },
  async getCityByCode(cityCode) {
    warnFallback()
    return snapshotSource.getCityByCode(cityCode)
  },
  async getTowns(cityCode) {
    warnFallback()
    return snapshotSource.getTowns(cityCode)
  },
  async getTownByCode(townCode) {
    warnFallback()
    return snapshotSource.getTownByCode(townCode)
  },
  async getPopulationStats(level, parentCode) {
    warnFallback()
    return snapshotSource.getPopulationStats(level, parentCode)
  },
  async getPopulationByCode(adminCode) {
    warnFallback()
    return snapshotSource.getPopulationByCode(adminCode)
  },
  async getElectionResults(level, parentCode) {
    warnFallback()
    return snapshotSource.getElectionResults(level, parentCode)
  },
  async getElectionResultByCode(adminCode) {
    warnFallback()
    return snapshotSource.getElectionResultByCode(adminCode)
  },
  async getProvinceBoundaries() {
    warnFallback()
    return snapshotSource.getProvinceBoundaries()
  },
  async getCityBoundaries(provinceCode) {
    warnFallback()
    return snapshotSource.getCityBoundaries(provinceCode)
  },
  async getTownBoundaries(cityCode) {
    warnFallback()
    return snapshotSource.getTownBoundaries(cityCode)
  },
}
