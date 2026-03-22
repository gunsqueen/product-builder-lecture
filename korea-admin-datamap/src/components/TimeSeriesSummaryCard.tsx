import type { TimeSeriesPoint } from '@/types/timeSeries'

interface TimeSeriesSummaryCardProps {
  title: string
  label: string
  points: TimeSeriesPoint[]
  changeValue: string
}

export function TimeSeriesSummaryCard({
  title,
  label,
  points,
  changeValue,
}: TimeSeriesSummaryCardProps) {
  const latestPoint = points[points.length - 1] ?? null

  return (
    <article className="panel">
      <span className="eyebrow">{title}</span>
      <h2>{label}</h2>
      <p>
        최근 값: {latestPoint?.formattedValue ?? '데이터 없음'}
      </p>
      <p>
        변화: {changeValue}
      </p>
      <p className="helper-text">
        {latestPoint?.sourceType ?? 'snapshot'} · 기준일 {latestPoint?.sourceDate ?? '1970-01-01'}
      </p>
    </article>
  )
}

