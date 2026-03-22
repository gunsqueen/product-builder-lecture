import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PopulationStats } from '@/types/population'
import type { Province } from '@/types/admin'
import { formatPopulation } from '@/utils/formatters'

interface PopulationBarChartProps {
  provinces: Province[]
  populationStats: PopulationStats[]
}

export function PopulationBarChart({
  provinces,
  populationStats,
}: PopulationBarChartProps) {
  const provinceNames = Object.fromEntries(
    provinces.map((province) => [province.code, province.shortName]),
  )

  const chartData = populationStats
    .filter((record) => record.adminLevel === 'province')
    .sort((left, right) => right.totalPopulation - left.totalPopulation)
    .slice(0, 8)
    .map((record) => ({
      name: provinceNames[record.adminCode] ?? record.adminCode,
      population: record.totalPopulation,
    }))

  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <span className="eyebrow">Recharts</span>
        <h2>상위 인구 시도</h2>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={(value) => formatPopulation(Number(value))} />
            <Bar dataKey="population" fill="#1e5d59" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
