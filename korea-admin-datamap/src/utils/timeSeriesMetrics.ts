import type { TimeSeriesPoint } from '@/types/timeSeries'

const getSortedPoints = (points: TimeSeriesPoint[]) =>
  [...points].sort((left, right) => left.year - right.year)

const getFirstLastPoints = (points: TimeSeriesPoint[]) => {
  const sortedPoints = getSortedPoints(points)
  return {
    firstPoint: sortedPoints[0] ?? null,
    lastPoint: sortedPoints[sortedPoints.length - 1] ?? null,
  }
}

export const calculatePopulationGrowthRate = (points: TimeSeriesPoint[]) => {
  const { firstPoint, lastPoint } = getFirstLastPoints(points)

  if (!firstPoint || !lastPoint || firstPoint.value === 0) {
    return 0
  }

  return ((lastPoint.value - firstPoint.value) / firstPoint.value) * 100
}

export const calculateAgingRateChange = (points: TimeSeriesPoint[]) => {
  const { firstPoint, lastPoint } = getFirstLastPoints(points)
  return firstPoint && lastPoint ? lastPoint.value - firstPoint.value : 0
}

export const calculateYouthRateChange = (points: TimeSeriesPoint[]) => {
  const { firstPoint, lastPoint } = getFirstLastPoints(points)
  return firstPoint && lastPoint ? lastPoint.value - firstPoint.value : 0
}

export const calculateTurnoutChange = (points: TimeSeriesPoint[]) => {
  const { firstPoint, lastPoint } = getFirstLastPoints(points)
  return firstPoint && lastPoint ? lastPoint.value - firstPoint.value : 0
}

export const calculateFirstSecondGapChange = (points: TimeSeriesPoint[]) => {
  const { firstPoint, lastPoint } = getFirstLastPoints(points)
  return firstPoint && lastPoint ? lastPoint.value - firstPoint.value : 0
}

