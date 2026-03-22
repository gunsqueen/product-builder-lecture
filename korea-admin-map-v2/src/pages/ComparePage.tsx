import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RegionSearchBox } from '../components/search/RegionSearchBox'
import { loadRegionComparisonEntry } from '../services/comparisonService'
import type { RegionComparisonEntry } from '../types/comparison'
import type { SearchRegionResult } from '../types/search'

const topCandidate = (entry: RegionComparisonEntry | null) =>
  entry?.electionResults.length ? [...entry.electionResults].sort((a, b) => b.voteRate - a.voteRate)[0] : null

export const ComparePage = () => {
  const [regionA, setRegionA] = useState<RegionComparisonEntry | null>(null)
  const [regionB, setRegionB] = useState<RegionComparisonEntry | null>(null)
  const [loadingKey, setLoadingKey] = useState<'A' | 'B' | null>(null)

  const selectRegion = async (slot: 'A' | 'B', region: SearchRegionResult) => {
    setLoadingKey(slot)
    const entry = await loadRegionComparisonEntry(region)
    if (slot === 'A') setRegionA(entry)
    if (slot === 'B') setRegionB(entry)
    setLoadingKey(null)
  }

  const chartData =
    regionA?.population && regionB?.population
      ? [
          { label: '총인구', A: regionA.population.totalPopulation, B: regionB.population.totalPopulation },
          { label: '세대수', A: regionA.population.householdCount, B: regionB.population.householdCount },
        ]
      : []

  return (
    <section className="map-card">
      <div className="map-header">
        <div>
          <span className="eyebrow">compare</span>
          <h2>지역 비교</h2>
          <p>현재 비교는 행정동 단위에 최적화되어 있습니다. 예: 화곡3동 vs 염창동</p>
        </div>
      </div>
      <div className="compare-grid">
        <div className="compare-column">
          <h3>지역 A</h3>
          <RegionSearchBox
            placeholder="비교할 행정동 검색"
            allowedLevels={['town']}
            onSelect={(region) => void selectRegion('A', region)}
          />
          <ComparisonCard entry={regionA} loading={loadingKey === 'A'} />
        </div>
        <div className="compare-column">
          <h3>지역 B</h3>
          <RegionSearchBox
            placeholder="비교할 행정동 검색"
            allowedLevels={['town']}
            onSelect={(region) => void selectRegion('B', region)}
          />
          <ComparisonCard entry={regionB} loading={loadingKey === 'B'} />
        </div>
      </div>
      <div className="chart-card">
        <h3>인구 비교</h3>
        {chartData.length > 0 ? (
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="A" fill="#2563eb" radius={[8, 8, 0, 0]} />
                <Bar dataKey="B" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>두 지역을 선택하면 비교 차트가 표시됩니다.</p>
        )}
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <strong>지역 A 상위 후보</strong>
          <span>
            {topCandidate(regionA)
              ? `${topCandidate(regionA)?.candidateName} ${topCandidate(regionA)?.voteRate.toFixed(1)}%`
              : '데이터 없음'}
          </span>
        </div>
        <div className="stat-card">
          <strong>지역 B 상위 후보</strong>
          <span>
            {topCandidate(regionB)
              ? `${topCandidate(regionB)?.candidateName} ${topCandidate(regionB)?.voteRate.toFixed(1)}%`
              : '데이터 없음'}
          </span>
        </div>
      </div>
    </section>
  )
}

const ComparisonCard = ({ entry, loading }: { entry: RegionComparisonEntry | null; loading: boolean }) => {
  if (loading) {
    return <div className="status-card">비교 데이터를 불러오는 중입니다.</div>
  }

  if (!entry) {
    return <div className="status-card">지역을 선택하면 비교 카드가 표시됩니다.</div>
  }

  return (
    <div className="status-card">
      <strong>{entry.region.name}</strong>
      <span>adminCode: {entry.region.adminCode}</span>
      <span>population source: {entry.populationSourceType}</span>
      <span>population fallback: {entry.populationFallbackReason}</span>
      <span>election source: {entry.electionSourceType}</span>
      <span>election fallback: {entry.electionFallbackReason}</span>
      <span>총인구: {entry.population ? `${entry.population.totalPopulation.toLocaleString()}명` : '데이터 없음'}</span>
      <span>세대수: {entry.population ? `${entry.population.householdCount.toLocaleString()}세대` : '데이터 없음'}</span>
      <span>남성 인구: {entry.population ? `${entry.population.malePopulation.toLocaleString()}명` : '데이터 없음'}</span>
      <span>여성 인구: {entry.population ? `${entry.population.femalePopulation.toLocaleString()}명` : '데이터 없음'}</span>
      <span>청년 비율: {entry.population?.youthRatio != null ? `${entry.population.youthRatio.toFixed(1)}%` : '데이터 없음'}</span>
      <span>고령화율: {entry.population?.agingRatio != null ? `${entry.population.agingRatio.toFixed(1)}%` : '데이터 없음'}</span>
    </div>
  )
}
