import type { DistributionItem } from '../types/population'

const sumByLabels = (items: DistributionItem[], labels: string[]) =>
  items.filter((item) => labels.includes(item.label)).reduce((sum, item) => sum + item.value, 0)

export const calculateYouthPopulation = (ageDistribution: DistributionItem[]) =>
  sumByLabels(ageDistribution, ['20~24세', '25~29세', '30~34세', '35~39세'])

export const calculateSeniorPopulation = (ageDistribution: DistributionItem[]) =>
  sumByLabels(ageDistribution, ['65~69세', '70~74세', '75~79세', '80~84세', '85~89세', '90~94세', '95~99세', '100세 이상'])

export const calculateAge0to14 = (ageDistribution: DistributionItem[]) =>
  sumByLabels(ageDistribution, ['0~4세', '5~9세', '10~14세'])

export const calculateAge15to64 = (ageDistribution: DistributionItem[]) =>
  sumByLabels(ageDistribution, ['15~19세', '20~24세', '25~29세', '30~34세', '35~39세', '40~44세', '45~49세', '50~54세', '55~59세', '60~64세'])

export const calculateYouthRatio = (youthPopulation: number, totalPopulation: number) =>
  totalPopulation > 0 ? (youthPopulation / totalPopulation) * 100 : null

export const calculateAgingRatio = (seniorPopulation: number, totalPopulation: number) =>
  totalPopulation > 0 ? (seniorPopulation / totalPopulation) * 100 : null
