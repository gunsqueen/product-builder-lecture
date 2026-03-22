import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PopulationStats } from '@/types/population'
import { formatNumber } from '@/utils/formatters'

interface PopulationMiniChartProps {
  record: PopulationStats | null
}

export function PopulationMiniChart({ record }: PopulationMiniChartProps) {
  if (!record) {
    return null
  }

  const chartData = [
    { label: '0-9', value: record.age0to9 },
    { label: '10-19', value: record.age10to19 },
    { label: '20-39', value: record.age20to29 + record.age30to39 },
    { label: '40-59', value: record.age40to49 + record.age50to59 },
    { label: '60+', value: record.age60to64 + record.age65plus },
  ]

  return (
    <div className="panel chart-panel mini-chart-panel">
      <div className="panel-head">
        <span className="eyebrow">연령 분포</span>
        <h2>Population Mini Chart</h2>
      </div>
      <div aria-label="연령대 분포 차트" className="mini-chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Bar dataKey="value" fill="#4f8b84" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="helper-text">0-9세부터 60세 이상까지의 인구 분포를 요약합니다.</p>
    </div>
  )
}
