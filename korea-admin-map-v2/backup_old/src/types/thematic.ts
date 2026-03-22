export interface ThematicMetricDefinition {
  key: 'totalPopulation' | 'agingRatio' | 'turnoutRate'
  label: string
  description: string
  domain: 'population' | 'election'
}

export interface ThematicValue {
  adminCode: string
  value: number | null
  formattedValue: string
}
