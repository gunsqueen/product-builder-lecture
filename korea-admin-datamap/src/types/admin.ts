import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'

export type AdminLevel = 'province' | 'city' | 'town'
export type DataSourceMode = 'mock' | 'snapshot' | 'real'
export type ProvinceCode = string
export type CityCode = string
export type AdminDongCode = string
export type TownCode = AdminDongCode
export type LegalDongCode = string
export type AdminCode = ProvinceCode | CityCode | TownCode
export type Coordinate = [number, number]
export type BoundaryParentCode = ProvinceCode | CityCode
export type JoinValidationStatus = 'valid' | 'mismatch' | 'skipped'
export type BoundarySourceType = 'mock' | 'snapshot' | 'real'
export type BoundaryGeometrySource =
  | 'sgis-real'
  | 'snapshot-file'
  | 'generated-grid'
  | 'unknown'

export interface ProvinceMasterRecord {
  provinceCode: ProvinceCode
  name: string
  shortName: string
  slug: string
  capital: string
  center: Coordinate
  populationRank: number
  cityCount: number
  description: string
}

export interface CityMasterRecord {
  cityCode: CityCode
  provinceCode: ProvinceCode
  name: string
  shortName: string
  slug: string
  adminType: 'city' | 'district' | 'county' | 'special'
  center: Coordinate
  townCount: number
  hasBoundary: boolean
}

export interface TownMasterRecord {
  townCode: TownCode
  adminDongCode?: AdminDongCode
  cityCode: CityCode
  provinceCode: ProvinceCode
  legalDongCode: LegalDongCode
  legalDongCodes?: LegalDongCode[]
  name: string
  shortName: string
  slug: string
  townType: 'eup' | 'myeon' | 'dong'
  center: Coordinate
  hasBoundary: boolean
}

export interface AdminDongLegalMappingRecord {
  adminDongCode: AdminDongCode
  provinceCode: ProvinceCode
  cityCode: CityCode
  adminDongName: string
  legalDongCode: LegalDongCode
  legalDongName: string
}

export interface Province {
  code: ProvinceCode
  name: string
  shortName: string
  slug: string
  capital: string
  center: Coordinate
  populationRank: number
  cityCount: number
  description: string
}

export interface CityDistrict {
  code: CityCode
  provinceCode: ProvinceCode
  name: string
  shortName: string
  slug: string
  adminType: 'city' | 'district' | 'county' | 'special'
  center: Coordinate
  townCount: number
  hasBoundary: boolean
}

export interface Town {
  code: TownCode
  adminDongCode?: AdminDongCode
  provinceCode: ProvinceCode
  cityCode: CityCode
  legalDongCode?: LegalDongCode
  legalDongCodes?: LegalDongCode[]
  name: string
  shortName: string
  slug: string
  townType: 'eup' | 'myeon' | 'dong'
  center: Coordinate
  hasBoundary: boolean
}

export interface BoundaryProperties {
  code: AdminCode
  adminCode: AdminCode
  name: string
  level: AdminLevel
  adminLevel: AdminLevel
  parentCode?: BoundaryParentCode
  geometryType: Geometry['type']
  sourceType: BoundarySourceType
  sourceDate: string
}

export type BoundaryFeature = Feature<Geometry, BoundaryProperties>
export interface BoundaryCollectionMetadata {
  adminLevel: AdminLevel
  featureCount: number
  geometryType: Geometry['type'] | 'mixed' | 'unknown'
  sourceType: BoundarySourceType
  sourceDate: string
  geometrySource?: BoundaryGeometrySource
}

export type BoundaryFeatureCollection = FeatureCollection<Geometry, BoundaryProperties> & {
  metadata?: BoundaryCollectionMetadata
}

export interface BoundaryDataModule {
  default: FeatureCollection<Geometry, GeoJsonProperties>
}

export type BoundaryLoader = () => Promise<BoundaryDataModule>
export type BoundaryLoaderRegistry<Code extends string = string> = Partial<
  Record<Code, BoundaryLoader>
>

export interface BoundaryLoadResult {
  collection: BoundaryFeatureCollection | null
  adminLevel: AdminLevel
  featureCount: number
  geometryType: Geometry['type'] | 'mixed' | 'unknown'
  sourceType: BoundarySourceType
  sourceDate: string
  geometrySource?: BoundaryGeometrySource
  statusCode?: number
  requestUrl?: string
  requestedAt?: string
  fallbackReason?: string
  fallbackReasonCode?: import('@/types/dataSource').FallbackReasonCode
  requestSent?: boolean
  responseReceived?: boolean
  parseSuccess?: boolean
  responsePreview?: string
  selectedSourceReason?: string
}

export interface JoinValidationResult {
  datasetName: string
  boundaryName: string
  status: JoinValidationStatus
  contextLabel?: string
  boundaryCodes: string[]
  adminCodes: string[]
  referenceName?: string
  referenceCodes?: string[]
  missingReferenceCodes?: string[]
  adminLevelMismatchCodes: string[]
  parentCodeMismatchCodes?: string[]
  missingPopulationCodes?: string[]
  missingElectionCodes?: string[]
  calculationUnavailableCodes?: string[]
  recordSourceTypes?: string[]
  boundarySourceType?: string
  mixedSourceWarning?: string
  matchedCount: number
  boundaryCount: number
  recordCount: number
  missingFeatureCodes: string[]
  missingRecordCodes: string[]
  isValid: boolean
}

export type BoundaryJoinResult = JoinValidationResult
