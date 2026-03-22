export const GANGSEO_TOWNS = [
  { code: '11160510', name: '염창동', cityCode: '11500', provinceCode: '11' },
  { code: '11160520', name: '등촌제1동', cityCode: '11500', provinceCode: '11' },
  { code: '11160530', name: '등촌제2동', cityCode: '11500', provinceCode: '11' },
  { code: '11160540', name: '등촌제3동', cityCode: '11500', provinceCode: '11' },
  { code: '11160550', name: '화곡본동', cityCode: '11500', provinceCode: '11' },
  { code: '11160570', name: '화곡제1동', cityCode: '11500', provinceCode: '11' },
  { code: '11160580', name: '화곡제2동', cityCode: '11500', provinceCode: '11' },
  { code: '11160590', name: '화곡제3동', cityCode: '11500', provinceCode: '11' },
  { code: '11160610', name: '화곡제4동', cityCode: '11500', provinceCode: '11' },
  { code: '11160630', name: '화곡제6동', cityCode: '11500', provinceCode: '11' },
  { code: '11160640', name: '화곡제8동', cityCode: '11500', provinceCode: '11' },
  { code: '11160650', name: '우장산동', cityCode: '11500', provinceCode: '11' },
  { code: '11160660', name: '가양제1동', cityCode: '11500', provinceCode: '11' },
  { code: '11160670', name: '가양제2동', cityCode: '11500', provinceCode: '11' },
  { code: '11160680', name: '가양제3동', cityCode: '11500', provinceCode: '11' },
  { code: '11160690', name: '발산제1동', cityCode: '11500', provinceCode: '11' },
  { code: '11160700', name: '공항동', cityCode: '11500', provinceCode: '11' },
  { code: '11160710', name: '방화제1동', cityCode: '11500', provinceCode: '11' },
  { code: '11160730', name: '방화제2동', cityCode: '11500', provinceCode: '11' },
  { code: '11160740', name: '방화제3동', cityCode: '11500', provinceCode: '11' },
] as const

export const getGangseoTownMeta = (townCode: string) => GANGSEO_TOWNS.find((town) => town.code === townCode)
