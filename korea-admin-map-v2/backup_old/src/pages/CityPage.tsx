import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { PopulationChart } from '../components/charts/PopulationChart'
import { StateBlock } from '../components/common/StateBlock'
import { ROUTES } from '../config/routes'
import { getCityByCode } from '../services/adminService'
import { loadTownBoundaries } from '../services/geoService'
import { loadPopulationByLevel, findPopulationRecord } from '../services/populationService'
import { loadElectionResults } from '../services/electionService'
import { getTopElectionResult } from '../utils/electionNormalizer'
import { formatNumber, formatPercent } from '../utils/format'
import type { BoundaryFeatureCollection } from '../types/admin'
import type { PopulationStats } from '../types/population'
import type { ElectionResult } from '../types/election'

export const CityPage = () => {
  const navigate = useNavigate()
  const { provinceCode = '', cityCode = '' } = useParams()
  const city = getCityByCode(cityCode)
  const [boundaries, setBoundaries] = useState<BoundaryFeatureCollection | null>(null)
  const [population, setPopulation] = useState<PopulationStats[]>([])
  const [election, setElection] = useState<ElectionResult[]>([])

  useEffect(() => {
    if (!cityCode) return
    void (async () => {
      const [boundaryData, populationData, electionData] = await Promise.all([
        loadTownBoundaries(cityCode),
        loadPopulationByLevel('town', cityCode),
        loadElectionResults('town', cityCode),
      ])
      setBoundaries(boundaryData)
      setPopulation(populationData)
      setElection(electionData)
    })()
  }, [cityCode])

  const metricLookup = useMemo(
    () => Object.fromEntries(population.map((record) => [record.adminCode, `${formatNumber(record.totalPopulation)}명`])),
    [population],
  )

  if (!city) {
    return <StateBlock title="시군구를 찾지 못했습니다" description="cityCode가 잘못되었거나 master 데이터가 비어 있습니다." />
  }

  if (!boundaries) {
    return <StateBlock title={`${city.name} 경계를 불러오는 중`} description="읍면동 경계와 통계를 준비하고 있습니다." />
  }

  const topElection = getTopElectionResult(election)
  const selectedPopulation = findPopulationRecord(population, boundaries.features[0]?.properties.adminCode ?? '')

  return (
    <div className="page-grid">
      <div className="breadcrumbs">
        <Link to={ROUTES.home}>홈</Link>
        <span>/</span>
        <Link to={ROUTES.province(provinceCode)}>{provinceCode}</Link>
        <span>/</span>
        <span>{city.name}</span>
      </div>
      <section className="page-hero">
        <div className="panel hero-card">
          <span className="hero-kicker">시군구 상세</span>
          <h1 className="hero-title">{city.name}</h1>
          <p className="hero-description">하위 읍면동 polygon을 클릭하면 개별 상세 페이지로 이동합니다.</p>
        </div>
        <div className="panel panel-body">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">하위 읍면동 수</div>
              <div className="summary-value">{boundaries.features.length}개</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">대표 후보</div>
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
            onFeatureClick={(feature) => navigate(ROUTES.town(provinceCode, cityCode, feature.properties.adminCode))}
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
