import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ElectionResult } from '../../types';
import { formatNumber, formatPercent } from '../../utils/formatters';

interface ElectionResultsPanelProps {
  elections: ElectionResult[];
}

export function ElectionResultsPanel({ elections }: ElectionResultsPanelProps) {
  const electionTypes = useMemo(
    () => [...new Set(elections.map((item) => item.electionType))],
    [elections],
  );
  const [selectedType, setSelectedType] = useState<string>('');
  const years = useMemo(
    () => [...new Set(elections.filter((item) => !selectedType || item.electionType === selectedType).map((item) => item.electionYear))].sort((a, b) => b - a),
    [elections, selectedType],
  );
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const electionOptions = useMemo(
    () =>
      filteredUniqueByElectionId(
        elections.filter(
          (item) => (!selectedType || item.electionType === selectedType) && (!selectedYear || item.electionYear === selectedYear),
        ),
      ),
    [elections, selectedType, selectedYear],
  );
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');

  useEffect(() => {
    setSelectedType(electionTypes[0] ?? '');
  }, [electionTypes]);

  useEffect(() => {
    setSelectedYear(years[0]);
  }, [years]);

  useEffect(() => {
    setSelectedElectionId(electionOptions[0]?.electionId ?? '');
  }, [electionOptions]);

  const filtered = useMemo(
    () =>
      elections.filter(
        (item) =>
          (!selectedType || item.electionType === selectedType) &&
          (!selectedYear || item.electionYear === selectedYear) &&
          (!selectedElectionId || item.electionId === selectedElectionId),
      ),
    [elections, selectedElectionId, selectedType, selectedYear],
  );
  const selectedElection = filtered[0];

  if (!elections.length) {
    return <p className="inline-note">선거 데이터가 없습니다.</p>;
  }

  return (
    <div className="page-stack">
      <div className="filter-grid filter-grid-two">
        <label className="field">
          <span>선거 종류</span>
          <select onChange={(event) => setSelectedType(event.target.value)} value={selectedType}>
            {electionTypes.map((type) => (
              <option key={type} value={type}>
                {formatElectionTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>연도</span>
          <select onChange={(event) => setSelectedYear(Number(event.target.value))} value={selectedYear}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>선거</span>
          <select onChange={(event) => setSelectedElectionId(event.target.value)} value={selectedElectionId}>
            {electionOptions.map((item) => (
              <option key={item.electionId} value={item.electionId}>
                {item.electionName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedElection ? (
        <>
          <div className="metric-grid metric-grid-three">
            <MetricCardLite label="선거명" value={selectedElection.electionName} />
            <MetricCardLite label="투표율" value={formatPercent(selectedElection.turnout)} />
            <MetricCardLite label="총투표수" value={`${formatNumber(selectedElection.totalVotes)}표`} />
            <MetricCardLite label="1위" value={selectedElection.results[0]?.label ?? '데이터 없음'} />
            {selectedElection.constituencyName ? <MetricCardLite label="선거구" value={selectedElection.constituencyName} /> : null}
          </div>

          <div className="two-column-grid">
            <div className="content-card">
              <div className="section-header">
                <div>
                  <h3>득표율 차트</h3>
                  <p>{selectedElection.electionName} 결과를 비율 기준으로 표시합니다.</p>
                </div>
              </div>
              <ResponsiveContainer height={280} width="100%">
                <BarChart data={selectedElection.results.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value: number) => `${value}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="share" radius={[6, 6, 0, 0]}>
                    {selectedElection.results.slice(0, 10).map((result) => (
                      <Cell fill={result.color ?? '#2f6fad'} key={result.label} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="content-card">
              <div className="section-header">
                <div>
                  <h3>후보/정당별 결과</h3>
                  <p>득표수와 득표율을 함께 표시합니다.</p>
                </div>
              </div>
              <div className="data-table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{selectedElection.resultMode === 'candidate' ? '후보' : '정당'}</th>
                      <th>정당</th>
                      <th>득표수</th>
                      <th>득표율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedElection.results.map((result) => (
                      <tr key={result.label}>
                        <td>{result.label}</td>
                        <td>{result.party ?? '-'}</td>
                        <td>{formatNumber(result.value)}표</td>
                        <td>{result.share.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="inline-note">선택한 조건에 해당하는 선거 데이터가 없습니다.</p>
      )}
    </div>
  );
}

function filteredUniqueByElectionId(elections: ElectionResult[]): ElectionResult[] {
  const seen = new Set<string>();
  return elections.filter((item) => {
    if (seen.has(item.electionId)) {
      return false;
    }
    seen.add(item.electionId);
    return true;
  });
}

function formatElectionTypeLabel(type: string): string {
  if (type === 'presidential') {
    return '대통령선거';
  }
  if (type === 'assembly') {
    return '국회의원선거';
  }
  if (type === 'mayoral') {
    return '단체장선거';
  }
  if (type === 'local') {
    return '지방선거';
  }
  return type;
}

function MetricCardLite({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
    </article>
  );
}
