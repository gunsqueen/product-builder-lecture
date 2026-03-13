import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ChartCard } from '../components/ChartCard';
import { DetailTabs } from '../components/DetailTabs';
import { ElectionResultsPanel } from '../components/elections/ElectionResultsPanel';
import { MetricCard } from '../components/MetricCard';
import { AgeRatioCards } from '../components/population/AgeRatioCards';
import { HouseholdCompositionTable } from '../components/population/HouseholdCompositionTable';
import { PopulationMetricsCards } from '../components/population/PopulationMetricsCards';
import { SourceBadgeRow } from '../components/SourceBadgeRow';
import { StatusState } from '../components/StatusState';
import { useDongDetail } from '../hooks/useDistrictDetail';
import { calculateAgeRatioMetrics, getAgeGroupColor } from '../utils/ageMetrics';
import { calculateHouseholdMetrics } from '../utils/householdMetrics';
import { formatArea, formatHouseholds, formatNumber, formatPercent, formatPopulation } from '../utils/formatters';
import type { DetailTabKey } from '../types';

export function DongPage() {
  const { districtCode, dongCode } = useParams();
  const { data, loading, error } = useDongDetail(districtCode, dongCode);
  const [activeTab, setActiveTab] = useState<DetailTabKey>('overview');

  if (loading) {
    return <StatusState description="행정동 상세 데이터를 불러오는 중입니다." title="행정동 준비 중" />;
  }

  if (error) {
    return <StatusState description={error} title="행정동 데이터를 불러오지 못했습니다." tone="error" />;
  }

  if (!data.dong) {
    return <StatusState description="요청한 행정동 데이터를 찾을 수 없습니다." title="행정동 없음" tone="error" />;
  }

  const genderData = data.population
    ? [
        { label: '남성', value: data.population.malePopulation ?? 0, color: '#2563eb' },
        { label: '여성', value: data.population.femalePopulation ?? 0, color: '#dc2626' },
      ]
    : [];
  const populationMetrics = data.population
    ? {
        ...calculateAgeRatioMetrics(data.population.ageGroups, data.population.totalPopulation),
        ...calculateHouseholdMetrics(
          data.population.totalPopulation,
          data.population.households,
          data.population.householdComposition,
        ),
      }
    : undefined;
  const latestElection = data.elections[0];

  return (
    <div className="page-stack">
      <Breadcrumbs
        items={[
          { label: '홈', to: '/' },
          { label: '서울시 지도', to: '/map' },
          { label: data.district?.districtName ?? '자치구', to: districtCode ? `/district/${districtCode}` : undefined },
          { label: data.dong.dongName },
        ]}
      />

      <section className="content-card">
        <div className="section-header">
          <div>
            <h1>{data.dong.dongName}</h1>
            <p>{data.dong.description ?? '실제 행정동 목록 기준 상세 페이지입니다.'}</p>
          </div>
        </div>
        <SourceBadgeRow items={data.sourceBadges} />
        <div className="metric-grid">
          <MetricCard label="총인구" value={formatPopulation(data.population?.totalPopulation)} />
          <MetricCard label="세대수" value={formatHouseholds(data.population?.households)} />
          <MetricCard label="면적" value={formatArea(data.dong.areaKm2)} />
          <MetricCard label="65세 이상 비율" value={formatPercent(populationMetrics?.senior65Ratio)} />
        </div>
      </section>

      <section className="content-card">
        <DetailTabs activeTab={activeTab} onChange={setActiveTab} />
      </section>

      {activeTab === 'overview' ? (
        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>행정동 개요</h2>
              <p>상위 자치구와 현재 제공되는 데이터 상태를 요약합니다.</p>
            </div>
          </div>
          <div className="entity-list">
            <div className="entity-link">
              <strong>상위 자치구</strong>
              <span>
                {data.district?.districtName ?? '정보 없음'}
                {districtCode ? (
                  <>
                    {' · '}
                    <Link to={`/district/${districtCode}`}>자치구 상세로 이동</Link>
                  </>
                ) : null}
              </span>
            </div>
            <div className="entity-link">
              <strong>행정동 코드</strong>
              <span>{data.dong.dongCode}</span>
            </div>
            <div className="entity-link">
              <strong>최근 선거 투표율</strong>
              <span>{formatPercent(latestElection?.turnout)}</span>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'population' ? (
        <section className="page-stack">
          <ChartCard description="총인구, 세대수, 평균 세대원수, 1인가구 비율을 표시합니다." title="핵심지표">
            <PopulationMetricsCards metrics={populationMetrics} stats={data.population} />
          </ChartCard>

          <ChartCard description="연령대별 핵심 비율입니다." title="연령비율">
            <AgeRatioCards metrics={populationMetrics} />
          </ChartCard>

          <section className="two-column-grid">
          <ChartCard description="행정동 연령대 비율과 규모를 함께 확인합니다." title="연령대 인구" isEmpty={!data.population?.ageGroups.length} emptyMessage="연령대 인구 데이터가 없습니다.">
            <ResponsiveContainer height={260} width="100%">
              <BarChart data={data.population?.ageGroups ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${formatNumber(value)}명`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {(data.population?.ageGroups ?? []).map((entry) => (
                    <Cell fill={getAgeGroupColor(entry.label)} key={entry.label} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="행정동 성별 분포" title="성별 인구" isEmpty={!genderData.length} emptyMessage="성별 인구 데이터가 없습니다.">
            <ResponsiveContainer height={260} width="100%">
              <BarChart data={genderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${formatNumber(value)}명`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {genderData.map((entry) => (
                    <Cell fill={entry.color} key={entry.label} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="세대원수별 세대수와 비율을 표시합니다." title="세대구조">
            <HouseholdCompositionTable composition={data.population?.householdComposition} />
          </ChartCard>
          </section>
        </section>
      ) : null}

      {activeTab === 'elections' ? (
        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>선거 결과</h2>
              <p>중앙선거관리위원회 원본을 가공한 실제 서울시 선거 스냅샷입니다.</p>
            </div>
          </div>
          <ElectionResultsPanel elections={data.elections} />
        </section>
      ) : null}

      {activeTab === 'other' ? (
        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>기타 확장 영역</h2>
              <p>생활인구, 시설, 민원 데이터는 이 탭에 이어서 붙일 수 있습니다.</p>
            </div>
          </div>
          <div className="placeholder-list">
            <div className="placeholder-card">생활인구 데이터 연결 예정</div>
            <div className="placeholder-card">시설 데이터 연결 예정</div>
            <div className="placeholder-card">민원 데이터 연결 예정</div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
