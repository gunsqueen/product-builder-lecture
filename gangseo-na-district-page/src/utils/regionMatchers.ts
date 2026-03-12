export const DISTRICT_CODE_FIELDS = [
  'districtCode',
  'SIG_CD',
  'sgg',
  'sigungu_cd',
  'sigungu_code',
  'sgg_cd',
  'sggnm_code',
  'code',
] as const;
export const DISTRICT_NAME_FIELDS = [
  'districtName',
  'SIG_KOR_NM',
  'sggnm',
  'sigungu_nm',
  'sgg_nm',
  'gu_nm',
  'name',
] as const;
export const DONG_CODE_FIELDS = ['dongCode', 'adm_cd2', 'ADSTRD_CODE_SE', 'adstrd_cd', 'adm_cd', 'emd_cd', 'code'] as const;
export const DONG_NAME_FIELDS = ['dongName', 'adm_nm', 'ADSTRD_NM', 'adstrd_nm', 'ADM_NM', 'emd_nm', 'name'] as const;
export const AREA_FIELDS = ['areaKm2', 'area_km2', 'AREA_KM2', 'area', 'AREA', 'shape_area', 'Shape_Area', 'ALAND'] as const;

export const DISTRICT_POPULATION_ROW_MATCHERS = {
  districtCode: ['SIGNGU_CODE_SE', 'GU_CODE', 'SIGUNGU_CODE', 'SGG_CD'],
  districtName: ['SIGNGU_NM', 'GU_NM', 'SIGUNGU_NM', 'SGG_NM'],
  totalPopulation: ['TOT_POPLTN_CO', 'TOT_POPLATION_CO', 'TOTAL_POPULATION', 'POPLTN_CO'],
  households: ['HSHLD_CO', 'HOUSEHOLDS', 'TOTAL_HOUSEHOLDS'],
  malePopulation: ['MALE_POPLTN_CO', 'MALE_CO', 'MALE_POPULATION'],
  femalePopulation: ['FEMALE_POPLTN_CO', 'FEMALE_CO', 'FEMALE_POPULATION'],
} as const;

export const DONG_POPULATION_ROW_MATCHERS = {
  districtCode: ['SIGNGU_CODE_SE', 'GU_CODE', 'SIGUNGU_CODE', 'SGG_CD'],
  districtName: ['SIGNGU_NM', 'GU_NM', 'SIGUNGU_NM', 'SGG_NM'],
  dongCode: ['ADSTRD_CODE_SE', 'ADM_CD', 'EMD_CD', 'HJDONG_CODE'],
  dongName: ['ADSTRD_NM', 'ADM_NM', 'EMD_NM', 'HJDONG_NM'],
  totalPopulation: ['TOT_POPLTN_CO', 'TOT_POPLATION_CO', 'TOTAL_POPULATION', 'POPLTN_CO'],
  households: ['HSHLD_CO', 'HOUSEHOLDS', 'TOTAL_HOUSEHOLDS'],
  malePopulation: ['MALE_POPLTN_CO', 'MALE_CO', 'MALE_POPULATION'],
  femalePopulation: ['FEMALE_POPLTN_CO', 'FEMALE_CO', 'FEMALE_POPULATION'],
} as const;
