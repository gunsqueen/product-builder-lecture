import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TimeSeriesPoint } from '@/types/timeSeries'

interface TimeSeriesChartProps {
  title: string
  eyebrow?: string
  points: TimeSeriesPoint[]
}

export function TimeSeriesChart({
  title,
  eyebrow = 'Trend',
  points,
}: TimeSeriesChartProps) {
  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value, _name, payload) =>
                payload?.payload?.formattedValue ?? String(value)
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#1e5d59"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="helper-text">
        {points[points.length - 1]?.sourceType ?? 'snapshot'} · 기준일{' '}
        {points[points.length - 1]?.sourceDate ?? '1970-01-01'}
      </p>
    </div>
  )
}

