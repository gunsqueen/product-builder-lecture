export const PROVINCES = [
  { code: '11', name: '서울특별시', shortName: '서울' },
  { code: '26', name: '부산광역시', shortName: '부산' },
  { code: '27', name: '대구광역시', shortName: '대구' },
  { code: '28', name: '인천광역시', shortName: '인천' },
  { code: '29', name: '광주광역시', shortName: '광주' },
  { code: '30', name: '대전광역시', shortName: '대전' },
  { code: '31', name: '울산광역시', shortName: '울산' },
  { code: '36', name: '세종특별자치시', shortName: '세종' },
  { code: '41', name: '경기도', shortName: '경기' },
  { code: '42', name: '강원특별자치도', shortName: '강원' },
  { code: '43', name: '충청북도', shortName: '충북' },
  { code: '44', name: '충청남도', shortName: '충남' },
  { code: '45', name: '전북특별자치도', shortName: '전북' },
  { code: '46', name: '전라남도', shortName: '전남' },
  { code: '47', name: '경상북도', shortName: '경북' },
  { code: '48', name: '경상남도', shortName: '경남' },
  { code: '50', name: '제주특별자치도', shortName: '제주' },
]

export const getProvinceMeta = (provinceCode: string) =>
  PROVINCES.find((province) => province.code === provinceCode)
