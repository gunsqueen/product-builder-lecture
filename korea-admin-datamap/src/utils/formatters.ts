export const formatNumber = (value: number) =>
  new Intl.NumberFormat('ko-KR').format(value)

export const formatPopulation = (value: number) =>
  `${formatNumber(value)}명`

export const formatPercent = (value: number) => `${value.toFixed(1)}%`
