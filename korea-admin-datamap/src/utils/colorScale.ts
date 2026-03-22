import type {
  ColorScaleMethod,
  LegendRange,
} from '@/types/thematicMap'

const clampIndex = (index: number, maxIndex: number) =>
  Math.min(Math.max(index, 0), maxIndex)

const getQuantileThresholds = (values: number[], bucketCount: number) => {
  const sortedValues = [...values].sort((left, right) => left - right)

  return Array.from({ length: bucketCount }, (_, index) => {
    const quantileIndex = Math.floor(((index + 1) / bucketCount) * sortedValues.length) - 1
    return sortedValues[clampIndex(quantileIndex, sortedValues.length - 1)]
  })
}

const getEqualIntervalThresholds = (values: number[], bucketCount: number) => {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const interval = bucketCount > 0 ? (max - min) / bucketCount : 0

  return Array.from({ length: bucketCount }, (_, index) => min + interval * (index + 1))
}

const getThresholds = (
  values: number[],
  bucketCount: number,
  method: ColorScaleMethod,
) =>
  method === 'equalInterval'
    ? getEqualIntervalThresholds(values, bucketCount)
    : getQuantileThresholds(values, bucketCount)

export const getColorForValue = (
  value: number | null,
  values: number[],
  colors: string[],
  method: ColorScaleMethod,
  noDataColor: string,
) => {
  if (value === null || values.length === 0) {
    return noDataColor
  }

  const thresholds = getThresholds(values, colors.length, method)
  const index = thresholds.findIndex((threshold) => value <= threshold)

  return colors[clampIndex(index === -1 ? colors.length - 1 : index, colors.length - 1)]
}

export const createLegendRanges = (
  values: number[],
  colors: string[],
  method: ColorScaleMethod,
  formatter: (value: number | null) => string,
): LegendRange[] => {
  if (values.length === 0) {
    return []
  }

  const thresholds = getThresholds(values, colors.length, method)
  const min = Math.min(...values)

  return colors.map((color, index) => {
    const rangeMin = index === 0 ? min : thresholds[index - 1]
    const rangeMax = thresholds[index] ?? thresholds[thresholds.length - 1]

    return {
      color,
      min: rangeMin,
      max: rangeMax,
      label: `${formatter(rangeMin)} - ${formatter(rangeMax)}`,
    }
  })
}
