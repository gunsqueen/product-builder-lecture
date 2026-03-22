import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { PopulationChart } from '../components/charts/PopulationChart'
import { StateBlock } from '../components/common/StateBlock'
import { ROUTES } from '../config/routes'
import { getProvinceByCode } from '../services/adminService'
import { loadCityBoundaries } from '../services/geoService'
import { loadPopulationByLevel, findPopulationRecord } from '../services/populationService'
import { loadElectionResults } from '../services/electionService'
import { getTopElectionResult } from '../utils/electionNormalizer'
import { formatNumber, formatPercent } from '../utils/format'
import type { BoundaryFeatureCollection } from '../types/admin'
import type { PopulationStats } from '../types/population'
import type { ElectionResult } from '../types/election'

export const ProvincePage = () => {
  const navigate = useNavigate()
  const { provinceCode = '' } = useParams()
  const province = getProvinceByCode(provinceCode)
  const [boundaries, setBoundaries] = useState<BoundaryFeatureCollection | null>(null)
  const [population, setPopulation] = useState<PopulationStats[]>([])
  const [election, setElection] = useState<ElectionResult[]>([])

  useEffect(() => {
    if (!provinceCode) return
    void (async () => {
      const [boundaryData, populationData, electionData] = await Promise.all([
        loadCityBoundaries(provinceCode),
        loadPopulationByLevel('city', provinceCode),
        loadElectionResults('city', provinceCode),
      ])
      setBoundaries(boundaryData)
      setPopulation(populationData)
      setElection(electionData)
    })()
  }, [provinceCode])

  const metricLookup = useMemo(
    () => Object.fromEntries(population.map((record) => [record.adminCode, `${formatNumber(record.totalPopulation)}명`])),
    [population],
  )

  if (!province) {
    return <StateBlock title="시도를 찾지 못했습니다" description="adminCode가 잘못되었거나 데이터가 비어 있습니다." />
  }

  if (!boundaries) {
    return <StateBlock title={`${province.name} 경계를 불러오는 중`} description="시군구 경계와 통계를 준비하고 있습니다." />
  }

  const topElection = getTopElectionResult(election)
  const selectedPopulation = findPopulationRecord(population, provinceCode.slice(0, 2) + '110') ?? population[0]

  return (
    <div className="page-grid">
      <div className="breadcrumbs">
        <Link to={ROUTES.home}>홈</Link>
        <span>/</span>
        <span>{province.name}</span>
      </div>
      <section className="page-hero">
        <div className="panel hero-card">
          <span className="hero-kicker">시도 상세</span>
          <h1 className="hero-title">{province.name}</h1>
          <p className="hero-description">자치단체 polygon을 클릭하면 하위 시군구로 drill-down 됩니다.</p>
        </div>
        <div className="panel panel-body">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">하위 시군구 수</div>
              <div className="summary-value">{boundaries.features.length}개</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">대표 선거 1위</div>
              <div className="summary-value">
                {topElection ? `${topElection.candidateName} ${formatPercent(topElection.voteRate)}` : '-'}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel map-panel">
          <BoundaryMap
            data={boundaries}
            metricLookup={metricLookup}
            onFeatureClick={(feature) => navigate(ROUTES.city(provinceCode, feature.properties.adminCode))}
          />
        </div>
        <div className="panel panel-body">
          <h2 className="section-title">예시 인구 구조</h2>
          {selectedPopulation ? <PopulationChart stats={selectedPopulation} /> : <p>인구 데이터 없음</p>}
        </div>
      </section>
    </div>
  )
}
