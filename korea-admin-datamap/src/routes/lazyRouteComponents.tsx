import { lazy } from 'react'

export const HomePageRoute = lazy(() =>
  import('@/pages/HomePage').then((module) => ({ default: module.HomePage })),
)

export const MapPageRoute = lazy(() =>
  import('@/pages/MapPage').then((module) => ({ default: module.MapPage })),
)

export const ComparePageRoute = lazy(() =>
  import('@/pages/ComparePage').then((module) => ({ default: module.ComparePage })),
)

export const TrendsPageRoute = lazy(() =>
  import('@/pages/TrendsPage').then((module) => ({ default: module.TrendsPage })),
)

export const ProvincePageRoute = lazy(() =>
  import('@/pages/ProvincePage').then((module) => ({ default: module.ProvincePage })),
)

export const CityPageRoute = lazy(() =>
  import('@/pages/CityPage').then((module) => ({ default: module.CityPage })),
)

export const TownPageRoute = lazy(() =>
  import('@/pages/TownPage').then((module) => ({ default: module.TownPage })),
)

export const ElectionsPageRoute = lazy(() =>
  import('@/pages/ElectionsPage').then((module) => ({ default: module.ElectionsPage })),
)

export const SourcesPageRoute = lazy(() =>
  import('@/pages/SourcesPage').then((module) => ({ default: module.SourcesPage })),
)

export const NotFoundPageRoute = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
