import type { PopulationStats } from '@/types/population'
import { formatNumber, formatPercent, formatPopulation } from '@/utils/formatters'
import { getSeniorRatio, getSexRatio, getYoungAdultRatio } from '@/utils/populationNormalizer'

interface PopulationSummaryCardProps {
  title: string
  record: PopulationStats | null
  primaryMetric: 'sexRatio' | 'seniorRatio' | 'youngAdultRatio'
}

const getMetricLabel = (
  primaryMetric: PopulationSummaryCardProps['primaryMetric'],
) => {
  if (primaryMetric === 'sexRatio') return '성비'
  if (primaryMetric === 'seniorRatio') return '65세 이상'
  return '20-39세'
}

const getMetricValue = (
  record: PopulationStats,
  primaryMetric: PopulationSummaryCardProps['primaryMetric'],
) => {
  if (primaryMetric === 'sexRatio') {
    return `${formatNumber(getSexRatio(record))}`
  }

  if (primaryMetric === 'seniorRatio') {
    return formatPercent(getSeniorRatio(record))
  }

  return formatPercent(getYoungAdultRatio(record))
}

export function PopulationSummaryCard({
  title,
  record,
  primaryMetric,
}: PopulationSummaryCardProps) {
  return (
    <article className="panel population-summary-card">
      <span className="eyebrow">Population</span>
      <h2>{title}</h2>
      {record ? (
        <>
          <p>총인구 {formatPopulation(record.totalPopulation)}</p>
          <p>세대수 {formatNumber(record.householdCount)}세대</p>
          <p>
            {getMetricLabel(primaryMetric)} {getMetricValue(record, primaryMetric)}
          </p>
          <p className="helper-text">
            {record.sourceType} · {record.sourceDate}
          </p>
        </>
      ) : (
        <p>표시할 인구 데이터가 없습니다.</p>
      )}
    </article>
  )
}
