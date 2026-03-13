import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ChartCard } from '../components/ChartCard';
import { DetailTabs } from '../components/DetailTabs';
import { ElectionResultsPanel } from '../components/elections/ElectionResultsPanel';
import { ElectionSummaryCards } from '../components/elections/ElectionSummaryCards';
import { GeoMap } from '../components/GeoMap';
import { MetricCard } from '../components/MetricCard';
import { AgeRatioCards } from '../components/population/AgeRatioCards';
import { HouseholdCompositionTable } from '../components/population/HouseholdCompositionTable';
import { PopulationMetricsCards } from '../components/population/PopulationMetricsCards';
import { SourceBadgeRow } from '../components/SourceBadgeRow';
import { StatusState } from '../components/StatusState';
import { useDistrictDetail } from '../hooks/useDistrictDetail';
import { calculateAgeRatioMetrics, getAgeGroupColor } from '../utils/ageMetrics';
import { calculateHouseholdMetrics } from '../utils/householdMetrics';
import { formatArea, formatHouseholds, formatNumber, formatPopulation } from '../utils/formatters';
import type { DetailTabKey } from '../types';

export function DistrictPage() {
  const { districtCode } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useDistrictDetail(districtCode);
  const [activeTab, setActiveTab] = useState<DetailTabKey>('overview');

  const ageChart = data.detail?.population?.ageGroups ?? [];
  const genderChart = data.detail?.population
    ? [
        { label: '남성', value: data.detail.population.malePopulation ?? 0, color: '#2563eb' },
        { label: '여성', value: data.detail.population.femalePopulation ?? 0, color: '#dc2626' },
      ]
    : [];
  const latestElection = data.detail?.districtElectionResults[0];
  const populationMetrics = data.detail?.population
    ? {
        ...calculateAgeRatioMetrics(data.detail.population.ageGroups, data.detail.population.totalPopulation),
        ...calculateHouseholdMetrics(
          data.detail.population.totalPopulation,
          data.detail.population.households,
          data.detail.population.householdComposition,
        ),
      }
    : undefined;

  const mapItems = useMemo(() => {
    if (data.joinedDongFeatures.length) {
      return data.joinedDongFeatures;
    }

    return data.districtBoundaries.geojson.features.map((feature) => ({ feature }));
  }, [data.districtBoundaries.geojson.features, data.joinedDongFeatures]);

  if (loading) {
    return <StatusState description="자치구 상세 데이터를 불러오는 중입니다." title="상세 페이지 준비 중" />;
  }

  if (error) {
    return <StatusState description={error} title="자치구 데이터를 불러오지 못했습니다." tone="error" />;
  }

  if (!data.detail) {
    return <StatusState description="요청한 자치구 코드를 찾을 수 없습니다." title="자치구 없음" tone="error" />;
  }

  return (
    <div className="page-stack">
      <Breadcrumbs
        items={[
          { label: '홈', to: '/' },
          { label: '서울시 지도', to: '/map' },
          { label: data.detail.district.districtName },
        ]}
      />

      <section className="content-card">
        <div className="section-header">
          <div>
            <h1>{data.detail.district.districtName}</h1>
            <p>{data.detail.district.description ?? '실제 행정구역 경계와 주민등록 통계 기준 자치구입니다.'}</p>
          </div>
        </div>
        <SourceBadgeRow items={data.sourceBadges} />
        <div className="metric-grid">
          <MetricCard label="총인구" value={formatPopulation(data.detail.population?.totalPopulation)} />
          <MetricCard label="세대수" value={formatHouseholds(data.detail.population?.households)} />
          <MetricCard label="행정동 수" value={`${formatNumber(data.detail.district.administrativeDongCount)}개`} />
          <MetricCard label="면적" value={formatArea(data.detail.district.areaKm2)} />
        </div>
      </section>

      <section className="content-card">
        <DetailTabs activeTab={activeTab} onChange={setActiveTab} />
      </section>

      {activeTab === 'overview' ? (
        <section className="two-column-grid">
          <ChartCard description="자치구 경계와 해당 자치구의 실제 행정동 경계를 함께 표시합니다." title="구 지도">
            <GeoMap
              errorMessage={null}
              height={460}
              items={mapItems}
              onFeatureClick={(code) => {
                const clickedDong = data.detail?.dongs.find((dong) => dong.dongCode === code);
                if (!clickedDong || !data.detail?.district.districtCode) {
                  return;
                }

                navigate(`/district/${data.detail.district.districtCode}/dong/${clickedDong.dongCode}`);
              }}
            />
            {!data.joinedDongFeatures.length ? (
              <p className="inline-note">이 자치구는 아직 행정동 경계가 연결되지 않았습니다. 자치구 경계만 표시합니다.</p>
            ) : (
              <p className="inline-note">지도의 행정동을 클릭하면 해당 동 상세 페이지로 이동합니다.</p>
            )}
          </ChartCard>

          <div className="page-stack">
            <ChartCard description="최근 실제 선거 결과 요약입니다." title="최근 선거 요약" isEmpty={!latestElection} emptyMessage="연결된 선거 결과가 없습니다.">
              <ElectionSummaryCards election={latestElection} />
            </ChartCard>

            <ChartCard description="실제 행정동 목록입니다. 항목을 누르면 동 상세 페이지로 이동합니다." title="행정동 목록" isEmpty={!data.detail.dongs.length} emptyMessage="행정동 목록 데이터가 없습니다.">
              <div className="entity-list">
                {data.detail.dongs.map((dong) => (
                  <Link className="entity-link" key={dong.dongCode} to={`/district/${data.detail?.district.districtCode}/dong/${dong.dongCode}`}>
                    <strong>{dong.dongName}</strong>
                    <span>
                      행정동 코드 {dong.dongCode}
                      {dong.areaKm2 !== undefined ? ` · ${formatArea(dong.areaKm2)}` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </ChartCard>
          </div>
        </section>
      ) : null}

      {activeTab === 'population' ? (
        <section className="page-stack">
          <ChartCard description="총인구, 세대수, 평균 세대원수, 1인가구 비율을 표시합니다." title="핵심지표">
            <PopulationMetricsCards metrics={populationMetrics} stats={data.detail.population} />
          </ChartCard>

          <ChartCard description="연령대별 핵심 비율입니다." title="연령비율">
            <AgeRatioCards metrics={populationMetrics} />
          </ChartCard>

          <section className="two-column-grid">
          <ChartCard description="연령대 구성 막대 차트" title="연령 구조" isEmpty={!ageChart.length} emptyMessage="연령대 인구 데이터가 없습니다.">
            <ResponsiveContainer height={260} width="100%">
              <BarChart data={ageChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${formatNumber(value)}명`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ageChart.map((entry) => (
                    <Cell fill={getAgeGroupColor(entry.label)} key={entry.label} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="성별 인구 비교" title="성별 구조" isEmpty={!genderChart.length} emptyMessage="성별 인구 데이터가 없습니다.">
            <ResponsiveContainer height={260} width="100%">
              <BarChart data={genderChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${formatNumber(value)}명`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {genderChart.map((entry) => (
                    <Cell fill={entry.color} key={entry.label} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="세대원수별 세대수와 비율을 표시합니다." title="세대구조">
            <HouseholdCompositionTable composition={data.detail.population?.householdComposition} />
          </ChartCard>
          </section>
        </section>
      ) : null}

      {activeTab === 'elections' ? (
        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>실제 선거결과</h2>
              <p>중앙선거관리위원회 원본을 가공한 실제 서울시 선거 스냅샷입니다.</p>
            </div>
          </div>
          <ElectionResultsPanel elections={data.detail.districtElectionResults} />
        </section>
      ) : null}

      {activeTab === 'other' ? (
        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>기타 확장 영역</h2>
              <p>생활인구, 시설, 민원, 복지 데이터는 이 탭에 이어서 붙일 수 있습니다.</p>
            </div>
          </div>
          <div className="placeholder-list">
            <div className="placeholder-card">생활인구 API 연결 영역</div>
            <div className="placeholder-card">시설 위치/개수 데이터 영역</div>
            <div className="placeholder-card">민원·정책 지표 데이터 영역</div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
