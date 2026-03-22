import type { ThematicMapResult } from '@/types/thematicMap'

interface MapLegendProps {
  result: ThematicMapResult | null
}

export function MapLegend({ result }: MapLegendProps) {
  if (!result) {
    return null
  }

  return (
    <div className="legend">
      <strong>{result.metricLabel}</strong>
      <p className="helper-text">{result.description}</p>
      <div className="legend-list">
        {result.legendRanges.map((range) => (
          <div key={`${range.color}-${range.label}`} className="legend-row">
            <span
              className="legend-swatch"
              style={{ backgroundColor: range.color }}
            />
            <span>{range.label}</span>
          </div>
        ))}
        <div className="legend-row">
          <span
            className="legend-swatch"
            style={{ backgroundColor: result.noDataColor }}
          />
          <span>데이터 없음</span>
        </div>
      </div>
      <p className="helper-text">
        {result.sourceDomain} · {result.sourceType} · {result.sourceDate}
      </p>
    </div>
  )
}
