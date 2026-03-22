import { BrowserRouter } from 'react-router-dom'
import { useNavigate, Link } from 'react-router-dom'
import { AppRouter } from './routes/AppRouter'
import { RegionSearchBox } from './components/search/RegionSearchBox'

export const App = () => {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

const AppShell = () => {
  const navigate = useNavigate()

  return (
    <main className="app-root">
      <section className="hero">
        <div className="hero-top">
          <div>
            <span className="eyebrow">stage 6</span>
            <h1>korea-admin-map-v2</h1>
            <p>전국 → 시도 → 시군구 → 읍면동 탐색, 검색, 비교까지 연결된 데이터맵 기반 구조입니다.</p>
          </div>
          <nav className="top-nav" aria-label="주요 페이지">
            <Link to="/map">지도</Link>
            <Link to="/search">검색</Link>
            <Link to="/compare">비교</Link>
            <Link to="/sources">Sources</Link>
          </nav>
        </div>
        <RegionSearchBox
          placeholder="예: 화곡3동, 강서구, 서울"
          onSelect={(region) => navigate(region.route)}
        />
      </section>
      <AppRouter />
    </main>
  )
}
