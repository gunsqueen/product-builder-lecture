import { THEMATIC_METRIC_LIST } from '@/config/thematicMetrics'
import type { ThematicMetricKey } from '@/types/thematicMap'

interface ThematicMapControlProps {
  metricKey: ThematicMetricKey
  onMetricChange: (metricKey: ThematicMetricKey) => void
}

export function ThematicMapControl({
  metricKey,
  onMetricChange,
}: ThematicMapControlProps) {
  const selectedMetric =
    THEMATIC_METRIC_LIST.find((metric) => metric.key === metricKey) ??
    THEMATIC_METRIC_LIST[0]
  const populationMetrics = THEMATIC_METRIC_LIST.filter(
    (metric) => metric.sourceDomain === 'population',
  )
  const electionMetrics = THEMATIC_METRIC_LIST.filter(
    (metric) => metric.sourceDomain === 'election',
  )

  return (
    <article className="panel">
      <div className="panel-head">
        <span className="eyebrow">테마맵 지표</span>
        <h2>{selectedMetric.label}</h2>
        <p>{selectedMetric.description}</p>
      </div>
      <label className="select-field">
        <span>지표 선택</span>
        <select
          aria-label="테마맵 지표 선택"
          className="select-input"
          onChange={(event) =>
            onMetricChange(event.target.value as ThematicMetricKey)
          }
          value={metricKey}
        >
          <optgroup label="인구 지표">
            {populationMetrics.map((metric) => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="선거 지표">
            {electionMetrics.map((metric) => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
    </article>
  )
}
