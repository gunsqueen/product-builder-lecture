import type { RouteObject } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ROUTES } from '@/config/routes'
import {
  CityPageRoute,
  ComparePageRoute,
  ElectionsPageRoute,
  HomePageRoute,
  MapPageRoute,
  NotFoundPageRoute,
  ProvincePageRoute,
  SourcesPageRoute,
  TownPageRoute,
  TrendsPageRoute,
} from '@/routes/lazyRouteComponents'

export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      {
        path: ROUTES.home,
        element: <HomePageRoute />,
      },
      {
        path: ROUTES.map,
        element: <MapPageRoute />,
      },
      {
        path: ROUTES.compare,
        element: <ComparePageRoute />,
      },
      {
        path: ROUTES.trends,
        element: <TrendsPageRoute />,
      },
      {
        path: ROUTES.provincePattern,
        element: <ProvincePageRoute />,
      },
      {
        path: ROUTES.cityPattern,
        element: <CityPageRoute />,
      },
      {
        path: ROUTES.townPattern,
        element: <TownPageRoute />,
      },
      {
        path: ROUTES.elections,
        element: <ElectionsPageRoute />,
      },
      {
        path: ROUTES.sources,
        element: <SourcesPageRoute />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPageRoute />,
  },
]
