import { Outlet } from 'react-router-dom'
import { APP_CONFIG } from '@/config/app'
import { AppHeader } from '@/components/navigation/AppHeader'

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="shell main-shell">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div className="shell footer-shell">
          <strong>{APP_CONFIG.appName}</strong>
          <p>mock / snapshot / real API 분리 구조와 GeoJSON lazy loading 전제를 포함한 전국 행정구역 데이터맵 초기 버전</p>
        </div>
      </footer>
    </div>
  )
}
