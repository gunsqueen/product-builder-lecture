export const getChoroplethFillColor = (
  value: number | undefined,
  sortedValues: number[],
) => {
  if (!value || sortedValues.length === 0) {
    return '#d6e1e3'
  }

  const step = Math.max(1, Math.floor(sortedValues.length / 5))
  const thresholds = [
    sortedValues[step - 1],
    sortedValues[step * 2 - 1],
    sortedValues[step * 3 - 1],
    sortedValues[step * 4 - 1],
  ].filter((item): item is number => item !== undefined)

  if (value <= thresholds[0]) return '#e7eef1'
  if (value <= thresholds[1]) return '#cfe0e2'
  if (value <= thresholds[2]) return '#9cc3bf'
  if (value <= thresholds[3]) return '#4f8b84'
  return '#1e5d59'
}
