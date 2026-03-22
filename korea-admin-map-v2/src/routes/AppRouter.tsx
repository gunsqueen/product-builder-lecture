import { Navigate, Route, Routes } from 'react-router-dom'
import { CityPage } from '../pages/CityPage'
import { ComparePage } from '../pages/ComparePage'
import { MapPage } from '../pages/MapPage'
import { ProvincePage } from '../pages/ProvincePage'
import { SearchPage } from '../pages/SearchPage'
import { SourcesPage } from '../pages/SourcesPage'
import { TownPage } from '../pages/TownPage'

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/map" replace />} />
    <Route path="/map" element={<MapPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/compare" element={<ComparePage />} />
    <Route path="/province/:provinceCode" element={<ProvincePage />} />
    <Route path="/province/:provinceCode/city/:cityCode" element={<CityPage />} />
    <Route path="/province/:provinceCode/city/:cityCode/town/:townCode" element={<TownPage />} />
    <Route path="/sources" element={<SourcesPage />} />
  </Routes>
)
