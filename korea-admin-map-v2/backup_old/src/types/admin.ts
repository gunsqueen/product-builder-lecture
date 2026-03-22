import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { SourceType } from '../config/app'

export type ProvinceCode = string
export type CityCode = string
export type TownCode = string
export type AdminCode = string
export type AdminLevel = 'province' | 'city' | 'town'

export interface Province {
  provinceCode: ProvinceCode
  name: string
  shortName: string
  slug: string
  center: [number, number]
}

export interface CityDistrict {
  cityCode: CityCode
  provinceCode: ProvinceCode
  name: string
  shortName: string
  slug: string
  adminType: string
  center: [number, number]
  townCount: number
}

export interface Town {
  townCode: TownCode
  cityCode: CityCode
  provinceCode: ProvinceCode
  name: string
  shortName: string
  slug: string
  townType: string
  center: [number, number]
  legalDongCodes: string[]
}

export interface BoundaryProperties {
  adminCode: AdminCode
  adminLevel: AdminLevel
  name: string
  parentCode?: AdminCode
  geometryType: Geometry['type']
  sourceType: SourceType
  sourceDate: string
}

export type BoundaryFeature = Feature<Geometry, BoundaryProperties>
export interface BoundaryFeatureCollection extends FeatureCollection<Geometry, BoundaryProperties> {
  metadata?: {
    sourceType: SourceType
    sourceDate: string
    adminLevel: AdminLevel
    featureCount: number
    geometryTypes: string[]
  }
}
