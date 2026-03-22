import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TimeSeriesComparisonResult } from '@/types/timeSeries'

interface TimeSeriesComparisonChartProps {
  comparison: TimeSeriesComparisonResult
}

export function TimeSeriesComparisonChart({
  comparison,
}: TimeSeriesComparisonChartProps) {
  const years = [...new Set([
    ...comparison.seriesA.map((point) => point.year),
    ...comparison.seriesB.map((point) => point.year),
  ])].sort((left, right) => left - right)

  const chartData = years.map((year) => ({
    year,
    regionA: comparison.seriesA.find((point) => point.year === year)?.value ?? null,
    regionAFormatted:
      comparison.seriesA.find((point) => point.year === year)?.formattedValue ?? '데이터 없음',
    regionB: comparison.seriesB.find((point) => point.year === year)?.value ?? null,
    regionBFormatted:
      comparison.seriesB.find((point) => point.year === year)?.formattedValue ?? '데이터 없음',
  }))

  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <span className="eyebrow">Time Series Compare</span>
        <h2>{comparison.regionA.name} vs {comparison.regionB.name}</h2>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(_value, name, payload) =>
                name === comparison.regionA.name
                  ? payload?.payload?.regionAFormatted
                  : payload?.payload?.regionBFormatted
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="regionA"
              name={comparison.regionA.name}
              stroke="#1e5d59"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="regionB"
              name={comparison.regionB.name}
              stroke="#d36239"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="helper-text">
        {comparison.sourceType} · 기준일 {comparison.sourceDate}
      </p>
    </div>
  )
}

