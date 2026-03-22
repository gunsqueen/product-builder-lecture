import type { Feature, FeatureCollection, Geometry } from 'geojson'

export type AdminLevel = 'province' | 'city' | 'town'
export type ProvinceCode = string
export type CityCode = string
export type TownCode = string

export interface Province {
  adminCode: ProvinceCode
  name: string
  level: 'province'
  parentCode: null
  sgisCode?: string
}

export interface CityDistrict {
  adminCode: CityCode
  name: string
  level: 'city'
  parentCode: ProvinceCode
  provinceCode: ProvinceCode
  sgisCode?: string
}

export interface Town {
  adminCode: TownCode
  name: string
  level: 'town'
  parentCode: CityCode
  provinceCode: ProvinceCode
  cityCode: CityCode
  sgisCode?: string
}

export interface BoundaryProperties {
  adminCode: string
  name: string
  level: AdminLevel
  parentCode?: string
  provinceCode?: string
  cityCode?: string
  fullName?: string
}

export type BoundaryFeature = Feature<Geometry, BoundaryProperties>
export type BoundaryCollection = FeatureCollection<Geometry, BoundaryProperties>
