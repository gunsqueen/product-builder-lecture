import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { StateBlock } from '../components/common/StateBlock'
import { ROUTES } from '../config/routes'
import { loadProvinceBoundaries } from '../services/geoService'
import { loadPopulationByLevel } from '../services/populationService'
import { loadElectionResults } from '../services/electionService'
import { buildThematicValues, THEMATIC_METRICS } from '../services/thematicMapService'
import { formatPercent } from '../utils/format'
import type { BoundaryFeatureCollection } from '../types/admin'
import type { PopulationStats } from '../types/population'
import type { ElectionResult } from '../types/election'

export const MapPage = () => {
  const navigate = useNavigate()
  const [boundaries, setBoundaries] = useState<BoundaryFeatureCollection | null>(null)
  const [population, setPopulation] = useState<PopulationStats[]>([])
  const [election, setElection] = useState<ElectionResult[]>([])
  const [metricKey, setMetricKey] = useState<'totalPopulation' | 'agingRatio' | 'turnoutRate'>('totalPopulation')

  useEffect(() => {
    void (async () => {
      const [boundaryData, populationData, electionData] = await Promise.all([
        loadProvinceBoundaries(),
        loadPopulationByLevel('province'),
        loadElectionResults('province'),
      ])
      setBoundaries(boundaryData)
      setPopulation(populationData)
      setElection(electionData)
    })()
  }, [])

  const metricLookup = useMemo(() => {
    const values = buildThematicValues(metricKey, population, election)
    return Object.fromEntries(values.map((item) => [item.adminCode, item.formattedValue]))
  }, [metricKey, population, election])

  if (!boundaries) {
    return <StateBlock title="전국 경계를 불러오는 중" description="시도 경계와 통계를 준비하고 있습니다." />
  }

  return (
    <div className="page-grid">
      <section className="page-hero">
        <div className="panel hero-card">
          <span className="hero-kicker">전국 지도</span>
          <h1 className="hero-title">대한민국 시도 테마맵</h1>
          <p className="hero-description">실경계 우선, 실패 시 snapshot fallback 정책으로 전국 시도 경계를 표시합니다.</p>
        </div>
        <div className="panel panel-body">
          <label className="field">
            <span className="field-label">지표 선택</span>
            <select value={metricKey} onChange={(event) => setMetricKey(event.target.value as never)}>
              {THEMATIC_METRICS.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
          <p className="metric-note">
            현재 선택 지표: {THEMATIC_METRICS.find((metric) => metric.key === metricKey)?.description}
          </p>
        </div>
      </section>
      <section className="panel map-panel">
        <BoundaryMap
          data={boundaries}
          metricLookup={metricLookup}
          onFeatureClick={(feature) => navigate(ROUTES.province(feature.properties.adminCode))}
        />
      </section>
      <section className="panel panel-body">
        <h2 className="section-title">대표 투표율</h2>
        <div className="summary-grid">
          {election
            .filter((record, index, array) => array.findIndex((item) => item.adminCode === record.adminCode) === index)
            .slice(0, 6)
            .map((record) => (
              <div key={record.adminCode} className="summary-card">
                <div className="summary-label">{record.regionName}</div>
                <div className="summary-value">{formatPercent(record.turnoutRate)}</div>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
