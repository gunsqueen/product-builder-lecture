import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PopulationStats } from '../../types/population'

export const PopulationChart = ({ stats }: { stats: PopulationStats }) => {
  const data = [
    { name: '0-14세', value: stats.age0to14 },
    { name: '15-64세', value: stats.age15to64 },
    { name: '65세+', value: stats.age65plus },
  ]

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#0b6b4b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
