import type { Town } from '@/types/admin'

export const mockTowns: Town[] = [
  { code: '11110515', provinceCode: '11', cityCode: '11110', name: '청운효자동', shortName: '청운효자', slug: 'cheongun-hyoja', townType: 'dong', center: [37.584, 126.969], hasBoundary: true },
  { code: '11110530', provinceCode: '11', cityCode: '11110', name: '삼청동', shortName: '삼청', slug: 'samcheong', townType: 'dong', center: [37.586, 126.981], hasBoundary: true },
  { code: '11110680', provinceCode: '11', cityCode: '11110', name: '혜화동', shortName: '혜화', slug: 'hyehwa', townType: 'dong', center: [37.586, 127.001], hasBoundary: true },
  { code: '26350510', provinceCode: '26', cityCode: '26350', name: '우1동', shortName: '우1동', slug: 'u1-dong', townType: 'dong', center: [35.162, 129.166], hasBoundary: false },
  { code: '26350580', provinceCode: '26', cityCode: '26350', name: '재송1동', shortName: '재송1동', slug: 'jaesong1-dong', townType: 'dong', center: [35.185, 129.129], hasBoundary: false },
  { code: '41117670', provinceCode: '41', cityCode: '41110', name: '매탄1동', shortName: '매탄1동', slug: 'maetan1-dong', townType: 'dong', center: [37.268, 127.043], hasBoundary: false },
  { code: '41117690', provinceCode: '41', cityCode: '41110', name: '광교1동', shortName: '광교1동', slug: 'gwanggyo1-dong', townType: 'dong', center: [37.286, 127.057], hasBoundary: false },
]
