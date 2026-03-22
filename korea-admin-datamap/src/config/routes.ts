export const ROUTES = {
  home: '/',
  map: '/map',
  compare: '/compare',
  trends: '/trends',
  elections: '/elections',
  sources: '/sources',
  provincePattern: '/province/:provinceCode',
  cityPattern: '/province/:provinceCode/city/:cityCode',
  townPattern: '/province/:provinceCode/city/:cityCode/town/:townCode',
  province: (provinceCode = ':provinceCode') => `/province/${provinceCode}`,
  city: (provinceCode = ':provinceCode', cityCode = ':cityCode') =>
    `/province/${provinceCode}/city/${cityCode}`,
  town: (
    provinceCode = ':provinceCode',
    cityCode = ':cityCode',
    townCode = ':townCode',
  ) => `/province/${provinceCode}/city/${cityCode}/town/${townCode}`,
} as const
