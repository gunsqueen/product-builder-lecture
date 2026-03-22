import { NavLink } from 'react-router-dom'
import { ROUTES } from '@/config/routes'

const navItems = [
  { to: ROUTES.home, label: '홈' },
  { to: ROUTES.map, label: '지도' },
  { to: ROUTES.compare, label: '비교' },
  { to: ROUTES.trends, label: '추세' },
  { to: ROUTES.elections, label: '선거' },
  { to: ROUTES.sources, label: '데이터 소스' },
]

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="shell header-shell">
        <NavLink className="brand" to={ROUTES.home}>
          <span className="brand-mark">KR</span>
          <div>
            <strong>Korea Admin Datamap</strong>
            <p>전국 행정구역 데이터맵 스타터</p>
          </div>
        </NavLink>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
