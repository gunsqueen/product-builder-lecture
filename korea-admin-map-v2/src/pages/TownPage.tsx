import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { loadTownBoundaries } from '../services/boundaryService'
import { getDataSourceStatuses } from '../services/dataSourceStatusService'
import { loadTownElectionResults } from '../services/electionService'
import { loadTownPopulation, findPopulationRecord } from '../services/populationService'
import type { BoundaryCollection } from '../types/admin'
import type { ElectionResult } from '../types/election'
import type { PopulationStats } from '../types/population'
import { getCityByCode, getProvinceByCode, getTownByCode } from '../utils/adminLookup'

export const TownPage = () => {
  const { provinceCode = '', cityCode = '', townCode = '' } = useParams()
  const province = getProvinceByCode(provinceCode)
  const city = getCityByCode(cityCode)
  const town = getTownByCode(townCode)
  const [data, setData] = useState<BoundaryCollection | null>(null)
  const [population, setPopulation] = useState<PopulationStats | null>(null)
  const [electionResults, setElectionResults] = useState<ElectionResult[]>([])
  const [boundaryError, setBoundaryError] = useState<string | null>(null)
  const [populationError, setPopulationError] = useState<string | null>(null)
  const [electionError, setElectionError] = useState<string | null>(null)
  const [populationLoading, setPopulationLoading] = useState(true)
  const [electionLoading, setElectionLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const result = await loadTownBoundaries(cityCode)
        setData(result)
      } catch (caught) {
        setBoundaryError(caught instanceof Error ? caught.message : '알 수 없는 오류')
      }
    }

    void run()
  }, [cityCode])

  useEffect(() => {
    if (!data) return

    const run = async () => {
      try {
        setPopulationLoading(true)
        const result = await loadTownPopulation(cityCode, data.features)
        const record = findPopulationRecord(result.records, townCode)
        if (import.meta.env.DEV) {
          console.log('[town:population]', {
            townCode,
            sourceType: result.sourceType,
            requestUrl: result.requestUrl,
            normalizedPopulationResult: record ?? null,
          })
        }
        setPopulation(record ?? null)
      } catch (caught) {
        setPopulationError(caught instanceof Error ? caught.message : '알 수 없는 오류')
      } finally {
        setPopulationLoading(false)
      }
    }

    void run()
  }, [cityCode, data, townCode])

  useEffect(() => {
    if (!data) return

    const run = async () => {
      try {
        setElectionLoading(true)
        const result = await loadTownElectionResults(townCode, data.features)
        if (import.meta.env.DEV) {
          console.log('[town:election]', {
            townCode,
            sourceType: result.sourceType,
            requestUrl: result.requestUrl,
            normalizedElectionResultCount: result.records.length,
            firstElectionResult: result.records[0] ?? null,
          })
        }
        setElectionResults(result.records)
      } catch (caught) {
        setElectionError(caught instanceof Error ? caught.message : '알 수 없는 오류')
      } finally {
        setElectionLoading(false)
      }
    }

    void run()
  }, [data, townCode])

  const selectedFeature = useMemo(
    () => data?.features.find((feature) => feature.properties.adminCode === townCode) ?? null,
    [data, townCode],
  )

  const populationStatus = getDataSourceStatuses().find((item) => item.sourceKey === 'population')
  const electionStatus = getDataSourceStatuses().find((item) => item.sourceKey === 'election')

  const ageChartData =
    population && population.ageDistribution.length > 0
      ? population.ageDistribution
      : []
  const householdSizeChartData = population?.householdSizeDistribution ?? []

  const sortedElectionResults = [...electionResults].sort((left, right) => right.voteRate - left.voteRate)
  const electionChartData = sortedElectionResults.slice(0, 3).map((record) => ({
    label: record.candidateName,
    rate: record.voteRate,
  }))

  if (!province) {
    return (
      <section className="map-card">
        <h2>시도를 찾을 수 없습니다</h2>
      </section>
    )
  }

  if (boundaryError) {
    return (
      <section className="map-card">
        <h2>읍면동 경계 로드 실패</h2>
        <p>{boundaryError}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="map-card">
        <h2>읍면동 상세 로딩 중</h2>
        <p>선택한 읍면동 경계를 준비하는 중입니다.</p>
      </section>
    )
  }

  if (!selectedFeature) {
    return (
      <section className="map-card">
        <h2>선택한 읍면동을 찾을 수 없습니다</h2>
        <p>townCode {townCode}에 해당하는 경계를 찾지 못했습니다.</p>
      </section>
    )
  }

  return (
    <section className="map-card">
      <div className="map-header">
        <div>
          <span className="eyebrow">town detail</span>
          <h2>{town?.name ?? selectedFeature.properties.name}</h2>
          <p>
            <Link to="/map">전국</Link> / <Link to={`/province/${provinceCode}`}>{province.name}</Link> /{' '}
            <Link to={`/province/${provinceCode}/city/${cityCode}`}>{city?.name ?? cityCode}</Link>
          </p>
        </div>
        <div className="map-meta">
          <span>population source: {populationStatus?.currentSourceType ?? '-'}</span>
          <span>status code: {populationStatus?.statusCode ?? '-'}</span>
          <span>fallback: {populationStatus?.fallbackReason ?? '-'}</span>
          <span>request url: {populationStatus?.requestUrl ?? '-'}</span>
          <span>timestamp: {populationStatus?.lastRequestTimestamp ?? '-'}</span>
        </div>
      </div>
      <BoundaryMap
        data={data}
        variant="town"
        selectedAdminCode={townCode}
        onFeatureClick={(feature) => {
          console.log('town clicked', feature.properties.adminCode)
        }}
      />
      <div className="stats-grid">
        <div className="stat-card">
          <strong>총인구</strong>
          <span>{populationLoading ? '불러오는 중' : population ? `${population.totalPopulation.toLocaleString()}명` : '데이터 없음'}</span>
        </div>
        <div className="stat-card">
          <strong>세대수</strong>
          <span>{populationLoading ? '불러오는 중' : population ? `${population.householdCount.toLocaleString()}세대` : '데이터 없음'}</span>
        </div>
        <div className="stat-card">
          <strong>남성 인구</strong>
          <span>{populationLoading ? '불러오는 중' : population ? `${population.malePopulation.toLocaleString()}명` : '데이터 없음'}</span>
        </div>
        <div className="stat-card">
          <strong>여성 인구</strong>
          <span>{populationLoading ? '불러오는 중' : population ? `${population.femalePopulation.toLocaleString()}명` : '데이터 없음'}</span>
        </div>
        <div className="stat-card">
          <strong>청년 비율</strong>
          <span>{population?.youthRatio != null ? `${population.youthRatio.toFixed(1)}%` : '연령 데이터 없음'}</span>
        </div>
        <div className="stat-card">
          <strong>고령화율</strong>
          <span>{population?.agingRatio != null ? `${population.agingRatio.toFixed(1)}%` : '연령 데이터 없음'}</span>
        </div>
      </div>
      <div className="chart-card">
        <h3>연령 분포</h3>
        <div className="source-row">
          <span>source: {population?.ageDistributionSourceType ?? '-'}</span>
          <span>청년 비율: {population?.youthRatio != null ? `${population.youthRatio.toFixed(1)}%` : '데이터 없음'}</span>
          <span>고령화율: {population?.agingRatio != null ? `${population.agingRatio.toFixed(1)}%` : '데이터 없음'}</span>
        </div>
        {ageChartData.length > 0 ? (
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ageChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>{populationError ? populationError : `연령 데이터 없음 (${populationStatus?.currentSourceType ?? '-'}/${populationStatus?.fallbackReason ?? '-'})`}</p>
        )}
      </div>
      <div className="chart-card">
        <h3>세대원수별 세대수</h3>
        <div className="source-row">
          <span>source: {population?.householdSizeSourceType ?? '-'}</span>
          <span>1인세대부터 6인 이상까지 표시</span>
        </div>
        {householdSizeChartData.length > 0 ? (
          <>
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={householdSizeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="distribution-table">
              {householdSizeChartData.map((item) => (
                <div className="distribution-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString()}세대</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>세대원수별 세대수 데이터 없음</p>
        )}
      </div>
      <div className="chart-card">
        <h3>최근 선거 결과</h3>
        <div className="source-row">
          <span>source: {electionStatus?.currentSourceType ?? '-'}</span>
          <span>status: {electionStatus?.statusCode ?? '-'}</span>
          <span>fallback: {electionStatus?.fallbackReason ?? '-'}</span>
        </div>
        {electionLoading ? (
          <p>선거 데이터를 불러오는 중입니다.</p>
        ) : sortedElectionResults.length > 0 ? (
          <>
            <div className="election-list">
              {sortedElectionResults.slice(0, 3).map((record) => (
                <div className="election-item" key={`${record.electionId}-${record.candidateName}`}>
                  <div>
                    <strong>{record.candidateName}</strong>
                    <span>{record.partyName}</span>
                  </div>
                  <div className="election-value">
                    <strong>{record.voteRate.toFixed(1)}%</strong>
                    <span>{record.voteCount.toLocaleString()}표</span>
                  </div>
                </div>
              ))}
            </div>
            {electionChartData.length > 0 ? (
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={electionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </>
        ) : (
          <p>{electionError ? electionError : '선거 데이터 없음'}</p>
        )}
      </div>
    </section>
  )
}
