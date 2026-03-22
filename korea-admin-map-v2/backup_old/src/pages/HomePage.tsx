import { Link } from 'react-router-dom'
import { ROUTES } from '../config/routes'

export const HomePage = () => (
  <div className="page-grid">
    <section className="page-hero">
      <div className="panel hero-card">
        <span className="hero-kicker">전국 행정 데이터맵</span>
        <h1 className="hero-title">행정구역, 인구, 선거를 한 지도에서 탐색</h1>
        <p className="hero-description">
          전국 → 시도 → 시군구 → 읍면동 drill-down, 인구 통계, 선거 결과, 비교, 검색, 테마맵을 한 구조로
          연결한 데이터맵 플랫폼입니다.
        </p>
        <div className="hero-actions">
          <Link className="button primary" to={ROUTES.map}>
            전국 지도 보기
          </Link>
          <Link className="button secondary" to={ROUTES.sources}>
            데이터 소스 상태
          </Link>
        </div>
      </div>
      <div className="panel panel-body">
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">탐색 단계</div>
            <div className="summary-value">전국 → 시도 → 시군구 → 읍면동</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">데이터 모드</div>
            <div className="summary-value">{import.meta.env.VITE_DATA_MODE ?? 'real'}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">핵심 기능</div>
            <div className="summary-value">비교 / 검색 / 테마맵 / Sources</div>
          </div>
        </div>
      </div>
    </section>
  </div>
)
