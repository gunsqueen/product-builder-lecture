import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ROUTES } from '../config/routes'
import { HomePage } from '../pages/HomePage'
import { MapPage } from '../pages/MapPage'
import { ProvincePage } from '../pages/ProvincePage'
import { CityPage } from '../pages/CityPage'
import { TownPage } from '../pages/TownPage'
import { ComparePage } from '../pages/ComparePage'
import { SourcesPage } from '../pages/SourcesPage'

export const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route path={ROUTES.home} element={<HomePage />} />
      <Route path={ROUTES.map} element={<MapPage />} />
      <Route path="/province/:provinceCode" element={<ProvincePage />} />
      <Route path="/province/:provinceCode/city/:cityCode" element={<CityPage />} />
      <Route path="/province/:provinceCode/city/:cityCode/town/:townCode" element={<TownPage />} />
      <Route path={ROUTES.compare} element={<ComparePage />} />
      <Route path={ROUTES.sources} element={<SourcesPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Route>
  </Routes>
)
