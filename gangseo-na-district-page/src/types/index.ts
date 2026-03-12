import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type DataSourceMode = 'mock' | 'real' | 'auto';
export type ResolvedDataSource = 'mock' | 'real';
export type AreaLevel = 'district' | 'dong';
export type ElectionType = 'presidential' | 'assembly' | 'local' | 'mayoral';
export type ResultMode = 'candidate' | 'party';
export type DistrictSortKey = 'name' | 'population';
export type MapMetricKey = 'population' | 'households' | 'turnout';
export type DetailTabKey = 'overview' | 'population' | 'elections' | 'other';

export interface ApiMetaInfo {
  requestedAt: string;
  dataUpdatedAt?: string;
  sourceLabel: string;
  resolvedSource: ResolvedDataSource;
  fallbackUsed: boolean;
  fallbackReason?: string;
  endpoint?: string;
}

export interface District {
  districtCode: string;
  districtName: string;
  slug: string;
  population: number;
  households: number;
  administrativeDongCount: number;
  areaKm2?: number;
  areaSource?: AreaStats['areaSource'];
  description?: string;
  centroid?: [number, number];
}

export interface Dong {
  dongCode: string;
  districtCode: string;
  districtName: string;
  dongName: string;
  areaKm2?: number;
  areaSource?: AreaStats['areaSource'];
  centroid?: [number, number];
  description?: string;
}

export interface AgeGroupStat {
  label: string;
  value: number;
}

export interface HouseholdComposition {
  totalHouseholds: number;
  onePerson: number;
  twoPerson: number;
  threePerson: number;
  fourPerson: number;
  fiveOrMore: number;
}

export interface AgeRatioMetrics {
  age10to19Ratio?: number;
  age2030Ratio?: number;
  senior65Ratio?: number;
}

export interface PopulationMetrics extends AgeRatioMetrics {
  averageHouseholdSize?: number;
  onePersonHouseholdRatio?: number;
  householdCompositionCoverageRatio?: number;
}

export interface AreaStats {
  regionCode: string;
  regionName: string;
  level: AreaLevel;
  areaKm2?: number;
  areaSource: 'property' | 'geometry' | 'none';
}

export interface PopulationStatsBase {
  totalPopulation: number;
  households: number;
  malePopulation?: number;
  femalePopulation?: number;
  ageGroups: AgeGroupStat[];
  averageHouseholdSize?: number;
  householdComposition?: HouseholdComposition;
}

export interface DistrictPopulationStats extends PopulationStatsBase {
  districtCode: string;
  districtName: string;
}

export interface DongPopulationStats extends PopulationStatsBase {
  districtCode: string;
  districtName: string;
  dongCode: string;
  dongName: string;
}

export interface ElectionEntry {
  label: string;
  party?: string;
  value: number;
  share: number;
  color?: string;
}

export interface ElectionSummary {
  winnerLabel?: string;
  winnerParty?: string;
  turnout?: number;
  totalVotes?: number;
  totalElectors?: number;
}

export interface ElectionResult {
  electionId: string;
  electionName: string;
  electionType: ElectionType;
  electionYear: number;
  resultMode: ResultMode;
  scopeLevel: 'city' | 'district' | 'dong';
  scopeCode: string;
  scopeName: string;
  districtCode?: string;
  districtName?: string;
  dongCode?: string;
  dongName?: string;
  constituencyName?: string;
  turnout: number;
  totalVotes: number;
  totalElectors?: number;
  updatedAt: string;
  source: string;
  results: ElectionEntry[];
}

export interface ElectionJoinResult {
  scopeLabel: string;
  level: AreaLevel;
  matchedCount: number;
  regionCount: number;
  unmatchedRegionCodes: string[];
  unmatchedElectionCodes: string[];
}

export interface NormalizedBoundaryFeatureProperties {
  districtCode: string;
  districtName: string;
  dongCode?: string;
  dongName?: string;
  level: AreaLevel;
  areaKm2?: number;
  areaSource?: AreaStats['areaSource'];
  centroid?: [number, number];
}

export type BoundaryFeature = Feature<Polygon | MultiPolygon, NormalizedBoundaryFeatureProperties>;
export type BoundaryCollection = FeatureCollection<Polygon | MultiPolygon, NormalizedBoundaryFeatureProperties>;
export type RegionBoundaryFeature = BoundaryFeature;

export interface JoinedBoundaryFeature {
  feature: BoundaryFeature;
  population?: DistrictPopulationStats | DongPopulationStats;
  election?: ElectionResult;
  area?: AreaStats;
}

export interface RegionJoinResult {
  scopeLabel: string;
  level: AreaLevel;
  boundaryCount: number;
  matchedCount: number;
  unmatchedBoundaryCodes: string[];
  unmatchedPopulationCodes: string[];
}

export interface PopulationDataset<T> {
  items: T[];
  meta: ApiMetaInfo;
}

export interface ElectionDataset {
  items: ElectionResult[];
  meta: ApiMetaInfo;
}

export interface BoundaryDataset {
  geojson: BoundaryCollection;
  meta: ApiMetaInfo;
}

export interface ResourceState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export interface DataSourceBadgeInfo {
  label: string;
  resolvedSource: ResolvedDataSource;
  fallbackUsed: boolean;
  fallbackReason?: string;
  endpoint?: string;
}

export interface DistrictDetailModel {
  district: District;
  population?: DistrictPopulationStats;
  dongs: Dong[];
  dongPopulation: DongPopulationStats[];
  districtElectionResults: ElectionResult[];
}

export interface GeoFeatureProperties {
  districtCode: string;
  districtName: string;
  dongCode?: string;
  dongName?: string;
  level: AreaLevel;
  centroid?: [number, number];
}
