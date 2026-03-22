import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PopulationComparisonResult } from '@/types/comparison'
import { formatPopulation } from '@/utils/formatters'

interface PopulationComparisonChartProps {
  comparison: PopulationComparisonResult
}

export function PopulationComparisonChart({
  comparison,
}: PopulationComparisonChartProps) {
  const chartData = [
    {
      name: comparison.regionA.name,
      population: comparison.regionAPopulation?.totalPopulation ?? 0,
    },
    {
      name: comparison.regionB.name,
      population: comparison.regionBPopulation?.totalPopulation ?? 0,
    },
  ]

  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <span className="eyebrow">Population Compare</span>
        <h2>총인구 비교</h2>
      </div>
      <div
        aria-label={`${comparison.regionA.name}와 ${comparison.regionB.name}의 총인구 비교 차트`}
        className="chart-box"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => formatPopulation(Number(value))} />
            <Bar dataKey="population" fill="#1e5d59" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="helper-text">
        {comparison.regionA.name} {formatPopulation(comparison.regionAPopulation?.totalPopulation ?? 0)} /
        {' '}
        {comparison.regionB.name} {formatPopulation(comparison.regionBPopulation?.totalPopulation ?? 0)}
      </p>
    </div>
  )
}
