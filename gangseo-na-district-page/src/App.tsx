import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DistrictPage } from './pages/DistrictPage';
import { DongPage } from './pages/DongPage';
import { ElectionsPage } from './pages/ElectionsPage';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SourcesPage } from './pages/SourcesPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />} path="/">
        <Route element={<HomePage />} index />
        <Route element={<MapPage />} path="map" />
        <Route element={<DistrictPage />} path="district/:districtCode" />
        <Route element={<DongPage />} path="district/:districtCode/dong/:dongCode" />
        <Route element={<ElectionsPage />} path="elections" />
        <Route element={<SourcesPage />} path="sources" />
        <Route element={<Navigate replace to="/" />} path="home" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}

export default App;
