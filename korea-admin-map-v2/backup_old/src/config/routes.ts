export const ROUTES = {
  home: '/',
  map: '/map',
  province: (provinceCode: string) => `/province/${provinceCode}`,
  city: (provinceCode: string, cityCode: string) => `/province/${provinceCode}/city/${cityCode}`,
  town: (provinceCode: string, cityCode: string, townCode: string) =>
    `/province/${provinceCode}/city/${cityCode}/town/${townCode}`,
  compare: '/compare',
  sources: '/sources',
} as const
