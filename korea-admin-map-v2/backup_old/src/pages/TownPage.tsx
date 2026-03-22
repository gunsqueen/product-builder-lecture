import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { PopulationChart } from '../components/charts/PopulationChart'
import { ElectionChart } from '../components/charts/ElectionChart'
import { StateBlock } from '../components/common/StateBlock'
import { ROUTES } from '../config/routes'
import { getCityByCode, getTownByCode } from '../services/adminService'
import { loadTownBoundaries } from '../services/geoService'
import { loadPopulationByLevel, findPopulationRecord } from '../services/populationService'
import { loadElectionResults } from '../services/electionService'
import type { BoundaryFeatureCollection } from '../types/admin'
import type { PopulationStats } from '../types/population'
import type { ElectionResult } from '../types/election'

export const TownPage = () => {
  const { provinceCode = '', cityCode = '', townCode = '' } = useParams()
  const city = getCityByCode(cityCode)
  const town = getTownByCode(townCode)
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
      setElection(electionData.filter((item) => item.adminCode === townCode))
    })()
  }, [cityCode, townCode])

  const metricLookup = useMemo(
    () => Object.fromEntries(population.map((record) => [record.adminCode, `${record.totalPopulation.toLocaleString('ko-KR')}명`])),
    [population],
  )
  const selectedPopulation = findPopulationRecord(population, townCode)

  if (!city || !town) {
    return <StateBlock title="읍면동을 찾지 못했습니다" description="townCode가 잘못되었거나 하위 데이터가 비어 있습니다." />
  }

  if (!boundaries) {
    return <StateBlock title={`${town.name} 지도를 불러오는 중`} description="상위 시군구 경계 안에서 선택 지역을 강조합니다." />
  }

  return (
    <div className="page-grid">
      <div className="breadcrumbs">
        <Link to={ROUTES.home}>홈</Link>
        <span>/</span>
        <Link to={ROUTES.province(provinceCode)}>{provinceCode}</Link>
        <span>/</span>
        <Link to={ROUTES.city(provinceCode, cityCode)}>{city.name}</Link>
        <span>/</span>
        <span>{town.name}</span>
      </div>
      <section className="page-hero">
        <div className="panel hero-card">
          <span className="hero-kicker">읍면동 상세</span>
          <h1 className="hero-title">{town.name}</h1>
          <p className="hero-description">선택된 읍면동 polygon을 강조해서 보여주고, 인구/선거 데이터를 함께 표시합니다.</p>
        </div>
      </section>
      <section className="content-grid">
        <div className="panel map-panel">
          <BoundaryMap data={boundaries} selectedCode={townCode} metricLookup={metricLookup} />
        </div>
        <div className="panel panel-body">
          <h2 className="section-title">인구 구조</h2>
          {selectedPopulation ? <PopulationChart stats={selectedPopulation} /> : <p>인구 데이터 없음</p>}
          <h2 className="section-title">선거 요약</h2>
          {election.length ? <ElectionChart records={election} /> : <p>선거 데이터 없음</p>}
        </div>
      </section>
    </div>
  )
}
