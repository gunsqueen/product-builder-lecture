interface BoundaryLegendProps {
  title: string
}

const legendColors = ['#e7eef1', '#cfe0e2', '#9cc3bf', '#4f8b84', '#1e5d59']

export function BoundaryLegend({ title }: BoundaryLegendProps) {
  return (
    <div className="legend">
      <strong>{title}</strong>
      <div className="legend-scale">
        {legendColors.map((color, index) => (
          <span
            key={color}
            className="legend-swatch"
            style={{ backgroundColor: color }}
            title={`단계 ${index + 1}`}
          />
        ))}
      </div>
      <p>mock 인구 값 기준 단계형 색상</p>
    </div>
  )
}
