import {
  loadCityBoundaries as loadCityBoundariesFromGeo,
  loadProvinceBoundaries as loadProvinceBoundariesFromGeo,
  loadTownBoundaries as loadTownBoundariesFromGeo,
} from '@/services/geoService'
import type { CityCode, ProvinceCode } from '@/types/admin'

export const loadProvinceBoundaries = () => loadProvinceBoundariesFromGeo()

export const loadCityBoundaries = (provinceCode: ProvinceCode) =>
  loadCityBoundariesFromGeo(provinceCode)

export const loadTownBoundaries = (cityCode: CityCode) =>
  loadTownBoundariesFromGeo(cityCode)
