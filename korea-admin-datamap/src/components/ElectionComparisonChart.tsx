import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ElectionComparisonResult } from '@/types/comparison'
import { formatPercent } from '@/utils/formatters'

interface ElectionComparisonChartProps {
  comparison: ElectionComparisonResult
}

export function ElectionComparisonChart({ comparison }: ElectionComparisonChartProps) {
  const chartData = [
    {
      name: comparison.regionA.name,
      voteRate: comparison.topResultA?.voteRate ?? 0,
    },
    {
      name: comparison.regionB.name,
      voteRate: comparison.topResultB?.voteRate ?? 0,
    },
  ]

  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <span className="eyebrow">Election Compare</span>
        <h2>상위 후보 득표율 비교</h2>
      </div>
      <div
        aria-label={`${comparison.regionA.name}와 ${comparison.regionB.name}의 상위 후보 득표율 비교 차트`}
        className="chart-box"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={(value) => formatPercent(Number(value))} />
            <Bar dataKey="voteRate" fill="#d36239" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="helper-text">
        {comparison.regionA.name} {formatPercent(comparison.topResultA?.voteRate ?? 0)} /{' '}
        {comparison.regionB.name} {formatPercent(comparison.topResultB?.voteRate ?? 0)}
      </p>
    </div>
  )
}
