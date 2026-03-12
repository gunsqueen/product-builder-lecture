import type { HouseholdComposition } from '../../types';
import { formatHouseholds, formatPercent } from '../../utils/formatters';

interface HouseholdCompositionTableProps {
  composition?: HouseholdComposition;
}

export function HouseholdCompositionTable({ composition }: HouseholdCompositionTableProps) {
  if (!composition) {
    return <p className="inline-note">세대원수별 세대수 데이터가 없습니다.</p>;
  }

  const rows = [
    { label: '1인 세대', value: composition.onePerson },
    { label: '2인 세대', value: composition.twoPerson },
    { label: '3인 세대', value: composition.threePerson },
    { label: '4인 세대', value: composition.fourPerson },
    { label: '5인 이상 세대', value: composition.fiveOrMore },
  ];

  return (
    <div className="data-table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>구성</th>
            <th>세대수</th>
            <th>비율</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{formatHouseholds(row.value)}</td>
              <td>{formatPercent(composition.totalHouseholds > 0 ? row.value / composition.totalHouseholds : undefined)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
