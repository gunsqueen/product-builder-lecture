const SOURCE_CARDS = [
  {
    title: '서울시 열린데이터광장',
    description: '등록인구, 생활인구, 자치구·행정동 단위 통계 확장에 사용할 수 있는 대표 소스',
    url: 'https://data.seoul.go.kr/',
  },
  {
    title: '공공데이터포털',
    description: '행정구역 통계, 시설, 민원, 공공서비스 데이터 확장 소스',
    url: 'https://www.data.go.kr/',
  },
  {
    title: '중앙선거관리위원회 선거통계시스템',
    description: '대선, 총선, 지방선거 결과 JSON/CSV 변환의 원본 기준',
    url: 'https://info.nec.go.kr/',
  },
  {
    title: '행정구역 경계 GeoJSON',
    description: '자치구·행정동 경계 파일을 교체할 때 사용하는 외부 GeoJSON 소스',
    url: 'https://github.com/vuski/admdongkor',
  },
] as const;

export function SourcesPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="section-header">
          <div>
            <h1>데이터 출처</h1>
            <p>현재 앱은 실제 행정동 경계와 공식 통계 스냅샷을 기본으로 사용하고, Open API 응답 시 실시간 데이터로 우선 갱신합니다.</p>
          </div>
        </div>

        <div className="source-grid">
          {SOURCE_CARDS.map((card) => (
            <a className="source-card" href={card.url} key={card.title} rel="noreferrer" target="_blank">
              <strong>{card.title}</strong>
              <p>{card.description}</p>
              <span>{card.url}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>기준 시점</h2>
            <p>인구·세대수 스냅샷 기준 시점은 2026년 2월이며, 선거 기준 시점은 2025년 제21대 대통령선거, 2024년 제22대 국회의원선거 지역구·비례대표, 2022년 제20대 대통령선거, 2022년 제8회 전국동시지방선거 서울시장·구청장·서울시교육감·서울시의원·구의원·비례대표, 2020년 제21대 국회의원선거 지역구·비례대표, 2018년 제7회 전국동시지방선거 서울시장·구청장·서울시교육감·서울시의원·구의원·비례대표, 2017년 제19대 대통령선거 결과입니다.</p>
          </div>
        </div>
        <p className="inline-note">데이터는 갱신 시점에 따라 달라질 수 있으며, 선거 연도와 현재 행정동 경계 연도가 다르면 일부 동은 선거결과가 비어 있을 수 있습니다.</p>
      </section>

      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>면적 산출 방식</h2>
            <p>현재 번들된 서울시 경계 GeoJSON에는 면적 속성이 없어서, 앱이 Polygon/MultiPolygon geometry를 기반으로 km² 면적을 계산합니다.</p>
          </div>
        </div>
        <p className="inline-note">향후 GeoJSON에 `areaKm2` 또는 GIS 면적 필드가 있으면 그 값을 우선 사용하고, 없을 때만 geometry 계산으로 fallback합니다.</p>
      </section>

      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>교체 위치</h2>
            <p>실제 데이터 파일과 API 연결 지점은 명확히 분리되어 있습니다.</p>
          </div>
        </div>
        <div className="entity-list">
          <div className="entity-link">
            <strong>fallback 스냅샷</strong>
            <span>`src/data/mock/*`</span>
          </div>
          <div className="entity-link">
            <strong>GeoJSON 경계</strong>
            <span>`src/data/geo/*`</span>
          </div>
          <div className="entity-link">
            <strong>실제 API 연결</strong>
            <span>`src/services/fetchDistrictPopulation.ts`, `src/services/fetchDongPopulation.ts`, `src/services/fetchSeoulOpenApi.ts`</span>
          </div>
          <div className="entity-link">
            <strong>실제 선거 결과 스냅샷</strong>
            <span>`src/data/elections/seoulElectionResults.json`, `src/services/elections/*`</span>
          </div>
        </div>
      </section>
    </div>
  );
}
