import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { MetricCard } from '../components/MetricCard';
import { SourceBadgeRow } from '../components/SourceBadgeRow';
import { StatusState } from '../components/StatusState';
import { useElectionOverview } from '../hooks/useElectionOverview';
import { formatNumber, formatPercent } from '../utils/formatters';

export function ElectionsPage() {
  const { data, loading, error } = useElectionOverview();
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const citywideElections = useMemo(
    () => data.elections.items.filter((item) => item.scopeLevel === 'city'),
    [data.elections.items],
  );
  const selectedElection = citywideElections.find((item) => item.electionId === selectedElectionId) ?? citywideElections[0];
  const [selectedLabel, setSelectedLabel] = useState('');

  useEffect(() => {
    setSelectedElectionId((current) => current || citywideElections[0]?.electionId || '');
  }, [citywideElections]);

  useEffect(() => {
    setSelectedLabel(selectedElection?.results[0]?.label ?? '');
  }, [selectedElection?.electionId, selectedElection?.results]);

  const districtResults = useMemo(() => {
    if (!selectedElection) {
      return [];
    }

    return data.elections.items
      .filter((item) => item.scopeLevel === 'district' && item.electionId === selectedElection.electionId)
      .map((item) => ({
        districtName: item.scopeName,
        share: item.results.find((result) => result.label === selectedLabel)?.share ?? 0,
      }))
      .sort((left, right) => right.share - left.share);
  }, [data.elections.items, selectedElection, selectedLabel]);

  if (loading) {
    return <StatusState description="선거 결과 대시보드를 구성하는 중입니다." title="선거 데이터 로딩" />;
  }

  if (error || !selectedElection) {
    return <StatusState description={error ?? '선택 가능한 선거 데이터가 없습니다.'} title="선거 데이터 없음" tone="error" />;
  }

  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="section-header">
          <div>
            <h1>서울시 선거 결과</h1>
            <p>중앙선거관리위원회 원본을 가공한 실제 서울시 선거 스냅샷을 사용하며, 동일한 구조로 외부 JSON/API로 교체할 수 있습니다.</p>
          </div>
        </div>
        <SourceBadgeRow items={data.sourceBadges} />

        <div className="filter-grid">
          <label className="field">
            <span>선거 선택</span>
            <select onChange={(event) => setSelectedElectionId(event.target.value)} value={selectedElection.electionId}>
              {citywideElections.map((item) => (
                <option key={item.electionId} value={item.electionId}>
                  {item.electionName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{selectedElection.resultMode === 'candidate' ? '후보 선택' : '정당 선택'}</span>
            <select onChange={(event) => setSelectedLabel(event.target.value)} value={selectedLabel}>
              {selectedElection.results.map((result) => (
                <option key={result.label} value={result.label}>
                  {result.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="metric-grid">
          <MetricCard label="선거명" value={selectedElection.electionName} />
          <MetricCard label="구분" value={selectedElection.resultMode === 'candidate' ? '후보별 비교' : '정당별 비교'} />
          <MetricCard label="서울시 투표율" value={formatPercent(selectedElection.turnout)} />
          <MetricCard label="총투표수" value={`${formatNumber(selectedElection.totalVotes)}표`} />
        </div>
      </section>

      <section className="two-column-grid">
        <ChartCard description="서울시 전체 결과" title="서울시 요약 차트">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={selectedElection.results}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value: number) => `${value}%`} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Bar dataKey="share" radius={[6, 6, 0, 0]}>
                {selectedElection.results.map((result) => (
                  <Cell fill={result.color ?? '#2f6fad'} key={result.label} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          description={`${selectedLabel} 기준 자치구별 득표율 비교`}
          title={selectedElection.resultMode === 'candidate' ? '자치구별 후보 득표율' : '자치구별 정당 득표율'}
          isEmpty={!districtResults.length}
          emptyMessage="자치구별 비교 데이터가 없습니다."
        >
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={districtResults}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis angle={-20} dataKey="districtName" height={60} interval={0} textAnchor="end" />
              <YAxis tickFormatter={(value: number) => `${value}%`} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Bar dataKey="share" fill="#2f6fad" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="inline-note">서울시 25개 자치구 전체를 같은 코드 체계로 비교합니다.</p>
        </ChartCard>
      </section>
    </div>
  );
}
