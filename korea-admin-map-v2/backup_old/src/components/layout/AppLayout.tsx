import { NavLink, Outlet } from 'react-router-dom'
import { SearchBox } from '../common/SearchBox'
import { ROUTES } from '../../config/routes'

export const AppLayout = () => (
  <div className="app-shell">
    <header className="app-header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-title">Korea Admin Map v2</span>
          <span className="brand-subtitle">전국 행정구역 데이터맵</span>
        </div>
        <SearchBox />
        <nav className="header-nav">
          <NavLink className="nav-link" to={ROUTES.home}>
            홈
          </NavLink>
          <NavLink className="nav-link" to={ROUTES.map}>
            지도
          </NavLink>
          <NavLink className="nav-link" to={ROUTES.compare}>
            비교
          </NavLink>
          <NavLink className="nav-link" to={ROUTES.sources}>
            Sources
          </NavLink>
        </nav>
      </div>
    </header>
    <main className="page-shell">
      <Outlet />
    </main>
  </div>
)
