export const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? new Intl.NumberFormat('ko-KR').format(value) : '-'

export const formatPercent = (value: number | null | undefined) =>
  typeof value === 'number' ? `${value.toFixed(1)}%` : '-'
