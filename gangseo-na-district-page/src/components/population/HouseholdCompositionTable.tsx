import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HouseholdComposition } from '../../types';
import { formatHouseholds, formatNumber, formatPercent } from '../../utils/formatters';

interface HouseholdCompositionTableProps {
  composition?: HouseholdComposition;
}

export function HouseholdCompositionTable({ composition }: HouseholdCompositionTableProps) {
  if (!composition) {
    return <p className="inline-note">세대원수별 세대수 데이터가 없습니다.</p>;
  }

  const rows = [
    { label: '1인 세대', value: composition.onePerson, color: '#ef4444' },
    { label: '2인 세대', value: composition.twoPerson, color: '#f59e0b' },
    { label: '3인 세대', value: composition.threePerson, color: '#2563eb' },
    { label: '4인 세대', value: composition.fourPerson, color: '#14b8a6' },
    { label: '5인 이상 세대', value: composition.fiveOrMore, color: '#7c3aed' },
  ].map((row) => ({
    ...row,
    ratio: composition.totalHouseholds > 0 ? row.value / composition.totalHouseholds : undefined,
  }));

  if (!rows.some((row) => row.value > 0)) {
    return <p className="inline-note">세대원수별 세대수 데이터가 없습니다.</p>;
  }

  return (
    <div className="chart-shell">
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis tickFormatter={(value) => formatNumber(Number(value))} type="number" />
          <YAxis dataKey="label" type="category" width={84} />
          <Tooltip
            formatter={(value: number, _name, item) => {
              const ratio = typeof item?.payload?.ratio === 'number' ? formatPercent(item.payload.ratio) : '데이터 없음';
              return [`${formatHouseholds(value)} · ${ratio}`, '세대구성'];
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {rows.map((row) => (
              <Cell fill={row.color} key={row.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-note-grid">
        {rows.map((row) => (
          <div className="chart-note-item" key={row.label}>
            <span className="chart-note-label">{row.label}</span>
            <strong>{formatHouseholds(row.value)}</strong>
            <span>{formatPercent(row.ratio)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
