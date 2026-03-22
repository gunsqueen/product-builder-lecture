interface MockPopulationSeed {
  adminCode: string
  level: 'province' | 'city' | 'town'
  totalPopulation: number
  householdCount: number
  updatedAt: string
  seniorsRatio: number
  daytimePopulation?: number
}

export const mockPopulationStats: MockPopulationSeed[] = [
  { adminCode: '11', level: 'province', totalPopulation: 9402215, householdCount: 4473255, seniorsRatio: 18.8, daytimePopulation: 10450000, updatedAt: '2026-01-01' },
  { adminCode: '26', level: 'province', totalPopulation: 3271420, householdCount: 1564120, seniorsRatio: 23.1, daytimePopulation: 3340000, updatedAt: '2026-01-01' },
  { adminCode: '27', level: 'province', totalPopulation: 2351284, householdCount: 1112030, seniorsRatio: 21.7, daytimePopulation: 2410000, updatedAt: '2026-01-01' },
  { adminCode: '28', level: 'province', totalPopulation: 3012148, householdCount: 1328420, seniorsRatio: 17.2, daytimePopulation: 3165000, updatedAt: '2026-01-01' },
  { adminCode: '29', level: 'province', totalPopulation: 1439627, householdCount: 658334, seniorsRatio: 18.9, daytimePopulation: 1480000, updatedAt: '2026-01-01' },
  { adminCode: '30', level: 'province', totalPopulation: 1440110, householdCount: 670253, seniorsRatio: 17.1, daytimePopulation: 1515000, updatedAt: '2026-01-01' },
  { adminCode: '31', level: 'province', totalPopulation: 1102458, householdCount: 482001, seniorsRatio: 16.8, daytimePopulation: 1180000, updatedAt: '2026-01-01' },
  { adminCode: '36', level: 'province', totalPopulation: 402117, householdCount: 163882, seniorsRatio: 11.4, daytimePopulation: 455000, updatedAt: '2026-01-01' },
  { adminCode: '41', level: 'province', totalPopulation: 13791356, householdCount: 5901268, seniorsRatio: 15.0, daytimePopulation: 14180000, updatedAt: '2026-01-01' },
  { adminCode: '42', level: 'province', totalPopulation: 1503318, householdCount: 763015, seniorsRatio: 24.9, daytimePopulation: 1540000, updatedAt: '2026-01-01' },
  { adminCode: '43', level: 'province', totalPopulation: 1599124, householdCount: 732118, seniorsRatio: 21.4, daytimePopulation: 1619000, updatedAt: '2026-01-01' },
  { adminCode: '44', level: 'province', totalPopulation: 2124378, householdCount: 973611, seniorsRatio: 20.5, daytimePopulation: 2180000, updatedAt: '2026-01-01' },
  { adminCode: '45', level: 'province', totalPopulation: 1741154, householdCount: 821233, seniorsRatio: 23.4, daytimePopulation: 1769000, updatedAt: '2026-01-01' },
  { adminCode: '46', level: 'province', totalPopulation: 1803111, householdCount: 856104, seniorsRatio: 26.7, daytimePopulation: 1835000, updatedAt: '2026-01-01' },
  { adminCode: '47', level: 'province', totalPopulation: 2549807, householdCount: 1183420, seniorsRatio: 25.3, daytimePopulation: 2602000, updatedAt: '2026-01-01' },
  { adminCode: '48', level: 'province', totalPopulation: 3240210, householdCount: 1461881, seniorsRatio: 20.2, daytimePopulation: 3290000, updatedAt: '2026-01-01' },
  { adminCode: '50', level: 'province', totalPopulation: 698911, householdCount: 307420, seniorsRatio: 16.1, daytimePopulation: 722000, updatedAt: '2026-01-01' },
  { adminCode: '11110', level: 'city', totalPopulation: 148210, householdCount: 76120, seniorsRatio: 21.2, updatedAt: '2026-01-01' },
  { adminCode: '11440', level: 'city', totalPopulation: 356443, householdCount: 177882, seniorsRatio: 17.1, updatedAt: '2026-01-01' },
  { adminCode: '11680', level: 'city', totalPopulation: 534221, householdCount: 224300, seniorsRatio: 16.2, updatedAt: '2026-01-01' },
  { adminCode: '11710', level: 'city', totalPopulation: 650912, householdCount: 281119, seniorsRatio: 15.7, updatedAt: '2026-01-01' },
  { adminCode: '26350', level: 'city', totalPopulation: 379411, householdCount: 169820, seniorsRatio: 19.3, updatedAt: '2026-01-01' },
  { adminCode: '41110', level: 'city', totalPopulation: 1189456, householdCount: 504182, seniorsRatio: 15.1, updatedAt: '2026-01-01' },
  { adminCode: '41130', level: 'city', totalPopulation: 914208, householdCount: 382401, seniorsRatio: 14.2, updatedAt: '2026-01-01' },
  { adminCode: '41280', level: 'city', totalPopulation: 1088111, householdCount: 470771, seniorsRatio: 15.4, updatedAt: '2026-01-01' },
  { adminCode: '41460', level: 'city', totalPopulation: 1099347, householdCount: 425330, seniorsRatio: 14.6, updatedAt: '2026-01-01' },
  { adminCode: '11110515', level: 'town', totalPopulation: 12054, householdCount: 5980, seniorsRatio: 22.9, updatedAt: '2026-01-01' },
  { adminCode: '11110530', level: 'town', totalPopulation: 7441, householdCount: 3661, seniorsRatio: 20.4, updatedAt: '2026-01-01' },
  { adminCode: '11110680', level: 'town', totalPopulation: 18993, householdCount: 9672, seniorsRatio: 19.8, updatedAt: '2026-01-01' },
]
