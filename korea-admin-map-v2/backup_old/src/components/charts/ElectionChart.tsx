import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ElectionResult } from '../../types/election'

const colors = ['#0b6b4b', '#ef4444', '#2563eb', '#f59e0b']

export const ElectionChart = ({ records }: { records: ElectionResult[] }) => (
  <div className="chart-wrap">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={records} dataKey="voteRate" nameKey="candidateName" outerRadius={82} label>
          {records.map((record, index) => (
            <Cell key={record.candidateName} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
)
