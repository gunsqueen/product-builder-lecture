import type {
  ThematicMetricDefinition,
  ThematicMetricKey,
} from '@/types/thematicMap'
import { formatNumber, formatPercent, formatPopulation } from '@/utils/formatters'

const populationScale = ['#eef3f4', '#d6e6e4', '#a8ccc7', '#5b9a92', '#1e5d59']
const electionScale = ['#f8eee8', '#f1d6c7', '#e8ad8e', '#d97a4d', '#b65429']

const percentFormatter = (value: number | null) =>
  value === null ? '데이터 없음' : formatPercent(value)

export const THEMATIC_METRICS: Record<ThematicMetricKey, ThematicMetricDefinition> = {
  totalPopulation: {
    key: 'totalPopulation',
    label: '총인구',
    description: '행정구역별 총인구를 색상으로 표현합니다.',
    sourceDomain: 'population',
    formatter: (value) => (value === null ? '데이터 없음' : formatPopulation(value)),
    defaultColorScale: populationScale,
    scaleMethod: 'quantile',
  },
  householdCount: {
    key: 'householdCount',
    label: '세대수',
    description: '행정구역별 세대수를 색상으로 표현합니다.',
    sourceDomain: 'population',
    formatter: (value) => (value === null ? '데이터 없음' : `${formatNumber(value)}세대`),
    defaultColorScale: populationScale,
    scaleMethod: 'quantile',
  },
  agingRate: {
    key: 'agingRate',
    label: '고령화율',
    description: '65세 이상 인구 비율을 색상으로 표현합니다.',
    sourceDomain: 'population',
    formatter: percentFormatter,
    defaultColorScale: populationScale,
    scaleMethod: 'equalInterval',
  },
  youth2039Rate: {
    key: 'youth2039Rate',
    label: '20-39세 비율',
    description: '20-39세 인구 비율을 색상으로 표현합니다.',
    sourceDomain: 'population',
    formatter: percentFormatter,
    defaultColorScale: populationScale,
    scaleMethod: 'equalInterval',
  },
  turnoutRate: {
    key: 'turnoutRate',
    label: '투표율',
    description: '기본 선거 기준 투표율을 색상으로 표현합니다.',
    sourceDomain: 'election',
    formatter: percentFormatter,
    defaultColorScale: electionScale,
    scaleMethod: 'equalInterval',
  },
  topCandidateVoteRate: {
    key: 'topCandidateVoteRate',
    label: '상위 후보 득표율',
    description: '기본 선거 기준 상위 후보 득표율을 색상으로 표현합니다.',
    sourceDomain: 'election',
    formatter: percentFormatter,
    defaultColorScale: electionScale,
    scaleMethod: 'equalInterval',
  },
  topPartyVoteRate: {
    key: 'topPartyVoteRate',
    label: '상위 정당 득표율',
    description: '기본 선거 기준 상위 정당 득표율을 색상으로 표현합니다.',
    sourceDomain: 'election',
    formatter: percentFormatter,
    defaultColorScale: electionScale,
    scaleMethod: 'equalInterval',
  },
}

export const THEMATIC_METRIC_LIST = Object.values(THEMATIC_METRICS)
