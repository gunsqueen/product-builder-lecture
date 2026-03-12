import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GeoMap } from '../components/GeoMap';
import { MetricCard } from '../components/MetricCard';
import { RouteCard } from '../components/RouteCard';
import { SearchSortControls } from '../components/SearchSortControls';
import { SourceBadgeRow } from '../components/SourceBadgeRow';
import { StatusState } from '../components/StatusState';
import { useDistrictIndexData } from '../hooks/useDistrictIndexData';
import { formatHouseholds, formatNumber, formatPopulation } from '../utils/formatters';
import type { DistrictSortKey } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const { data, loading, error } = useDistrictIndexData();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<DistrictSortKey>('name');

  const filteredDistricts = useMemo(() => {
    const keyword = search.trim();
    return [...data.districts]
      .filter((district) => district.districtName.includes(keyword))
      .sort((left, right) => {
        if (sortKey === 'population') {
          return right.population - left.population;
        }

        return left.districtName.localeCompare(right.districtName, 'ko');
      });
  }, [data.districts, search, sortKey]);

  const cityPopulation = data.districtPopulation.items.reduce((sum, item) => sum + item.totalPopulation, 0);
  const cityHouseholds = data.districtPopulation.items.reduce((sum, item) => sum + item.households, 0);

  if (loading) {
    return <StatusState description="서울시 전체 데이터를 불러오는 중입니다." title="초기 데이터 로딩" />;
  }

  if (error) {
    return <StatusState description={error} title="데이터를 불러오지 못했습니다." tone="error" />;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">서울시 전체 데이터 계층</p>
          <h1>서울특별시 데이터맵</h1>
          <p>실제 행정동 경계와 서울시 공식 통계 스냅샷을 기본으로 사용하고, Open API가 응답하면 실시간 값으로 우선 교체하는 구조입니다.</p>
        </div>
        <SourceBadgeRow items={data.sourceBadges} />
        <div className="metric-grid">
          <MetricCard helper="자치구 합산" label="서울시 총인구" value={formatPopulation(cityPopulation)} />
          <MetricCard helper="자치구 합산" label="서울시 세대수" value={formatHouseholds(cityHouseholds)} />
          <MetricCard helper="실제 경계 기준" label="자치구" value={`${formatNumber(data.districts.length)}개`} />
          <MetricCard helper="실제 행정동 기준" label="행정동" value={`${formatNumber(data.dongsCount)}개`} />
        </div>
      </section>

      <section className="two-column-grid">
        <div className="content-card">
          <div className="section-header">
            <div>
              <h2>서울시 전체 지도 미리보기</h2>
              <p>첫 화면은 25개 자치구만 렌더링해서 성능을 유지하고, 클릭 시 상세 페이지로 이동합니다.</p>
            </div>
          </div>
          <GeoMap
            errorMessage={null}
            height={420}
            items={data.joinedDistrictFeatures}
            onFeatureClick={(districtCode) => navigate(`/district/${districtCode}`)}
          />
        </div>

        <div className="content-card">
          <div className="section-header">
            <div>
              <h2>자치구 탐색</h2>
              <p>가나다순/인구순 정렬과 검색을 동시에 지원합니다.</p>
            </div>
          </div>
          <SearchSortControls
            onSearchChange={setSearch}
            onSortChange={setSortKey}
            search={search}
            sortKey={sortKey}
          />
          <div className="entity-list">
            {filteredDistricts.slice(0, 10).map((district) => (
              <Link className="entity-link" key={district.districtCode} to={`/district/${district.districtCode}`}>
                <strong>{district.districtName}</strong>
                <span>{formatPopulation(district.population)} · {formatHouseholds(district.households)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="route-grid">
        <RouteCard description="자치구별 choropleth 지도와 범례, 상세 이동" title="서울시 전체 지도" to="/map" />
        <RouteCard description="대선·총선 비례대표 등 결과 비교 구조" title="선거 결과 페이지" to="/elections" />
        <RouteCard description="API 키 설정, GeoJSON 교체, 스크립트 사용 방법" title="데이터 출처와 가이드" to="/sources" />
      </section>
    </div>
  );
}
