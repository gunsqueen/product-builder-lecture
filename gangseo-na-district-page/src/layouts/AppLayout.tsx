import { NavLink, Outlet } from 'react-router-dom';
import { getDataSourceMode } from '../config/dataSource';

const NAV_ITEMS = [
  { to: '/', label: '홈' },
  { to: '/map', label: '지도' },
  { to: '/elections', label: '선거 결과' },
  { to: '/sources', label: '데이터 출처' },
] as const;

export function AppLayout() {
  const dataSourceMode = getDataSourceMode();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <p className="eyebrow">Seoul City Data Map</p>
          <NavLink className="brand-link" to="/">
            서울시 데이터맵
          </NavLink>
          <p className="brand-description">자치구와 행정동 단위로 서울시 인구·선거 데이터를 탐색하는 정적 웹앱</p>
          <div className="source-badge-row">
            <span className="source-badge">mode: {dataSourceMode}</span>
          </div>
        </div>
        <nav className="site-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>서울시 데이터맵 · 실제 경계/공식 통계 스냅샷 기반 · API 실패 시 fallback 지원</p>
      </footer>
    </div>
  );
}
