import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ElectionResult } from '@/types/election'
import { formatNumber, formatPercent } from '@/utils/formatters'

interface ElectionResultChartProps {
  results: ElectionResult[]
}

export function ElectionResultChart({ results }: ElectionResultChartProps) {
  if (results.length === 0) {
    return null
  }

  const chartData = results
    .slice()
    .sort((left, right) => right.voteRate - left.voteRate)
    .map((result) => ({
      name: result.partyName,
      voteRate: result.voteRate,
      voteCount: result.voteCount,
    }))

  return (
    <div className="panel chart-panel mini-chart-panel">
      <div className="panel-head">
        <span className="eyebrow">득표율</span>
        <h2>Election Result Chart</h2>
      </div>
      <div aria-label="정당별 득표율 차트" className="mini-chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name, item) =>
                name === 'voteRate'
                  ? formatPercent(Number(value))
                  : formatNumber(Number(item.payload.voteCount))
              }
            />
            <Bar dataKey="voteRate" fill="#d36239" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="helper-text">정당별 득표율을 높은 순서로 표시합니다.</p>
    </div>
  )
}
