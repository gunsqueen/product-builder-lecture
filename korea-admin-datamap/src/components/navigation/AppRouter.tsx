import { BrowserRouter, HashRouter } from 'react-router-dom'
import { APP_CONFIG } from '@/config/app'
import App from '@/App'

export function AppRouter() {
  const Router = APP_CONFIG.useHashRouter ? HashRouter : BrowserRouter

  return (
    <Router>
      <App />
    </Router>
  )
}
