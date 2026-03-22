import { Link } from 'react-router-dom'
import { PopulationBarChart } from '@/components/charts/PopulationBarChart'
import { ErrorPanel, LoadingPanel } from '@/components/common/StatePanel'
import { RegionSearchBox } from '@/components/RegionSearchBox'
import { StatCard } from '@/components/common/StatCard'
import { ROUTES } from '@/config/routes'
import { useAsyncData } from '@/hooks/useAsyncData'
import { listProvinces } from '@/services/adminDataService'
import { getPopulationStats } from '@/services/populationDataService'

export function HomePage() {
  const provincesState = useAsyncData(() => listProvinces(), [])
  const populationState = useAsyncData(() => getPopulationStats('province'), [])
  const chartError = provincesState.error ?? populationState.error

  return (
    <section className="page">
      <div className="hero-grid">
        <div className="hero-copy panel hero-panel">
          <span className="eyebrow">Stage 1</span>
          <h1>대한민국 전국 행정구역 데이터맵</h1>
          <p>
            시도 &gt; 시군구 &gt; 행정동 3단계 확장을 전제로 설계된 React + Vite +
            TypeScript 기반 웹앱입니다. 현재 버전은 전국 시도 지도와 시군구 상세 구조
            진입점까지 구현되어 있습니다.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to={ROUTES.map}>
              지도 보기
            </Link>
            <Link className="button button-secondary" to={ROUTES.compare}>
              지역 비교
            </Link>
            <Link className="button button-secondary" to={ROUTES.sources}>
              데이터 구조 보기
            </Link>
          </div>
        </div>

        <div className="hero-metrics">
          <StatCard
            label="행정 체계"
            value="3단계"
            description="시도 > 시군구 > 행정동 확장 전제"
          />
          <StatCard
            label="데이터 계층"
            value="3분리"
            description="경계 / 인구 / 선거 데이터를 독립 서비스로 분리"
          />
          <StatCard
            label="소스 모드"
            value="mock"
            description="snapshot, real API 어댑터 추가만으로 전환 가능"
          />
        </div>
      </div>

      {chartError ? (
        <ErrorPanel message={chartError} />
      ) : provincesState.data && populationState.data ? (
        <PopulationBarChart
          populationStats={populationState.data}
          provinces={provincesState.data}
        />
      ) : (
        <LoadingPanel message="차트 데이터를 불러오는 중입니다." />
      )}

      <article className="panel">
        <div className="panel-head">
          <span className="eyebrow">검색</span>
          <h2>전국 지역 바로 찾기</h2>
        </div>
        <RegionSearchBox title="전국 지역 검색" />
      </article>

      <div className="card-grid">
        <article className="panel">
          <span className="eyebrow">현재 구현</span>
          <h2>현재 구현 범위</h2>
          <ul className="simple-list">
            <li>전국 지역 검색과 상세 페이지 이동</li>
            <li>시도 / 시군구 / 행정동 계층 라우트</li>
            <li>인구 / 선거 / 경계 join 검증 로그</li>
            <li>비교 화면으로 인구 및 선거 차이 확인</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">다음 확장</span>
          <h2>다음 확장 포인트</h2>
          <ul className="simple-list">
            <li>검색 자동완성 랭킹 고도화</li>
            <li>지역 간 다중 비교와 연도 비교</li>
            <li>생활인구·시설 데이터 서비스 어댑터 확장</li>
            <li>Capacitor 래핑을 위한 공통 서비스 재사용</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
