import type {
  AdminCode,
  AdminLevel,
  BoundaryFeatureCollection,
  CityCode,
  CityDistrict,
  Province,
  ProvinceCode,
  Town,
  TownCode,
} from '@/types/admin'
import type { ElectionResult } from '@/types/election'
import type { PopulationStats } from '@/types/population'

export interface AdminDataSource {
  readonly name: string
  getProvinces(): Promise<Province[]>
  getProvinceByCode(provinceCode: ProvinceCode): Promise<Province | null>
  getCities(provinceCode: ProvinceCode): Promise<CityDistrict[]>
  getCityByCode(cityCode: CityCode): Promise<CityDistrict | null>
  getTowns(cityCode: CityCode): Promise<Town[]>
  getTownByCode(townCode: TownCode): Promise<Town | null>
  getPopulationStats(
    level: AdminLevel,
    parentCode?: AdminCode,
  ): Promise<PopulationStats[]>
  getPopulationByCode(adminCode: AdminCode): Promise<PopulationStats | null>
  getElectionResults(
    level: AdminLevel,
    parentCode?: AdminCode,
  ): Promise<ElectionResult[]>
  getElectionResultByCode(adminCode: AdminCode): Promise<ElectionResult | null>
  getProvinceBoundaries(): Promise<BoundaryFeatureCollection>
  getCityBoundaries(
    provinceCode: ProvinceCode,
  ): Promise<BoundaryFeatureCollection | null>
  getTownBoundaries(cityCode: CityCode): Promise<BoundaryFeatureCollection | null>
}
