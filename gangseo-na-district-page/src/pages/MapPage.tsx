import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GeoMap } from '../components/GeoMap';
import { SearchSortControls } from '../components/SearchSortControls';
import { StatusState } from '../components/StatusState';
import { useCompactScreen } from '../hooks/useCompactScreen';
import { useDistrictIndexData } from '../hooks/useDistrictIndexData';
import { formatPopulation } from '../utils/formatters';
import type { DistrictSortKey, MapMetricKey } from '../types';

export function MapPage() {
  const navigate = useNavigate();
  const isCompactScreen = useCompactScreen();
  const { data, loading, error } = useDistrictIndexData();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<DistrictSortKey>('name');
  const [metricKey, setMetricKey] = useState<MapMetricKey>('population');

  const districts = useMemo(() => {
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

  if (loading) {
    return <StatusState description="서울시 자치구 경계와 통계를 불러오는 중입니다." title="지도 준비 중" />;
  }

  if (error) {
    return <StatusState description={error} title="지도를 표시할 수 없습니다." tone="error" />;
  }

  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="section-header">
          <div>
            <h1>서울시 전체 지도</h1>
            <p>자치구 단위 choropleth를 우선 렌더링하고, 자치구 상세에서만 행정동 지도를 불러옵니다.</p>
          </div>
        </div>
        <SearchSortControls
          metricKey={metricKey}
          onMetricChange={setMetricKey}
          onSearchChange={setSearch}
          onSortChange={setSortKey}
          search={search}
          sortKey={sortKey}
        />
      </section>

      <section className="two-column-grid">
        <div className="content-card">
          <GeoMap
            errorMessage={null}
            height={isCompactScreen ? 420 : 620}
            items={data.joinedDistrictFeatures}
            metricKey={metricKey}
            onFeatureClick={(districtCode) => navigate(`/district/${districtCode}`)}
          />
        </div>

        <div className="content-card">
          <div className="section-header">
            <div>
              <h2>자치구 목록</h2>
              <p>{districts.length}개 자치구가 검색 조건에 맞습니다.</p>
            </div>
          </div>
          <div className="entity-list">
            {districts.map((district) => (
              <Link className="entity-link" key={district.districtCode} to={`/district/${district.districtCode}`}>
                <strong>{district.districtName}</strong>
                <span>{formatPopulation(district.population)} · 행정동 {district.administrativeDongCount}개</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
