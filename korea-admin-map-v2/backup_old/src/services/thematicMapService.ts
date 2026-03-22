import { calculateAgingRatio, calculateTopVoteRate, calculateTotalPopulation, calculateTurnoutRate } from '../utils/metricCalculators'
import type { ElectionResult } from '../types/election'
import type { PopulationStats } from '../types/population'
import type { ThematicMetricDefinition, ThematicValue } from '../types/thematic'

export const THEMATIC_METRICS: ThematicMetricDefinition[] = [
  {
    key: 'totalPopulation',
    label: '총인구',
    description: '지역별 총인구',
    domain: 'population',
  },
  {
    key: 'agingRatio',
    label: '고령화율',
    description: '65세 이상 비율',
    domain: 'population',
  },
  {
    key: 'turnoutRate',
    label: '투표율',
    description: '대표 선거 투표율',
    domain: 'election',
  },
]

export const buildThematicValues = (
  metricKey: ThematicMetricDefinition['key'],
  population: PopulationStats[],
  election: ElectionResult[],
): ThematicValue[] => {
  const electionByCode = election.reduce<Record<string, ElectionResult[]>>((acc, record) => {
    acc[record.adminCode] = [...(acc[record.adminCode] ?? []), record]
    return acc
  }, {})

  return population.map((record) => {
    const value =
      metricKey === 'totalPopulation'
        ? calculateTotalPopulation(record)
        : metricKey === 'agingRatio'
          ? calculateAgingRatio(record)
          : metricKey === 'turnoutRate'
            ? calculateTurnoutRate(electionByCode[record.adminCode] ?? [])
            : calculateTopVoteRate(electionByCode[record.adminCode] ?? [])
    return {
      adminCode: record.adminCode,
      value,
      formattedValue:
        metricKey === 'totalPopulation'
          ? `${record.totalPopulation.toLocaleString('ko-KR')}명`
          : value === null
            ? '-'
            : `${value.toFixed(1)}%`,
    }
  })
}
