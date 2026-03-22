import { useMemo, useState } from 'react'
import { searchRegions } from '../services/searchService'
import { loadPopulationByLevel } from '../services/populationService'
import { loadElectionResults } from '../services/electionService'
import { compareElection, comparePopulation } from '../services/comparisonService'
import { StateBlock } from '../components/common/StateBlock'
import { formatNumber, formatPercent } from '../utils/format'
import type { SearchResultItem } from '../types/search'
import type { PopulationStats } from '../types/population'
import type { ElectionResult } from '../types/election'

export const ComparePage = () => {
  const [leftQuery, setLeftQuery] = useState('서울특별시')
  const [rightQuery, setRightQuery] = useState('부산광역시')
  const [leftRegion, setLeftRegion] = useState<SearchResultItem | null>(null)
  const [rightRegion, setRightRegion] = useState<SearchResultItem | null>(null)
  const [leftPopulation, setLeftPopulation] = useState<PopulationStats | undefined>()
  const [rightPopulation, setRightPopulation] = useState<PopulationStats | undefined>()
  const [leftElection, setLeftElection] = useState<ElectionResult[]>([])
  const [rightElection, setRightElection] = useState<ElectionResult[]>([])
  const leftResults = useMemo(() => searchRegions(leftQuery), [leftQuery])
  const rightResults = useMemo(() => searchRegions(rightQuery), [rightQuery])

  const runCompare = async (side: 'left' | 'right', region: SearchResultItem) => {
    const level = region.adminLevel
    const parentCode = level === 'province' ? undefined : level === 'city' ? region.provinceCode : region.cityCode
    const [populationRecords, electionRecords] = await Promise.all([
      loadPopulationByLevel(level, level === 'province' ? undefined : level === 'city' ? region.provinceCode : region.cityCode),
      loadElectionResults(level, parentCode),
    ])
    const populationRecord = populationRecords.find((item) => item.adminCode === region.adminCode)
    const electionRecord = electionRecords.filter((item) => item.adminCode === region.adminCode)
    if (side === 'left') {
      setLeftRegion(region)
      setLeftPopulation(populationRecord)
      setLeftElection(electionRecord)
    } else {
      setRightRegion(region)
      setRightPopulation(populationRecord)
      setRightElection(electionRecord)
    }
  }

  const populationDiff = comparePopulation(leftPopulation, rightPopulation)
  const electionDiff = compareElection(leftElection, rightElection)

  return (
    <div className="page-grid">
      <section className="page-hero">
        <div className="panel hero-card">
          <span className="hero-kicker">지역 비교</span>
          <h1 className="hero-title">두 지역을 나란히 비교</h1>
          <p className="hero-description">인구 규모, 고령화율, 대표 선거 결과를 같은 화면에서 비교합니다.</p>
        </div>
      </section>
      <section className="content-grid">
        {([['left', leftQuery, setLeftQuery, leftResults], ['right', rightQuery, setRightQuery, rightResults]] as const).map(
          ([side, value, setValue, results]) => (
            <div className="panel panel-body" key={side}>
              <label className="field">
                <span className="field-label">{side === 'left' ? '왼쪽 지역' : '오른쪽 지역'}</span>
                <input value={value} onChange={(event) => setValue(event.target.value)} />
              </label>
              <div className="list">
                {results.slice(0, 6).map((item) => (
                  <button className="list-item" type="button" key={item.adminCode} onClick={() => void runCompare(side, item)}>
                    <div>
                      <div className="list-item-name">{item.name}</div>
                      <div className="list-item-meta">{item.parentName}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ),
        )}
      </section>
      {!leftRegion || !rightRegion ? (
        <StateBlock title="비교할 지역을 선택하세요" description="검색 결과에서 두 지역을 각각 선택하면 비교 결과가 나타납니다." />
      ) : (
        <section className="panel panel-body">
          <h2 className="section-title">비교 결과</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">총인구 차이</div>
              <div className="summary-value">{formatNumber(populationDiff.totalPopulationDiff)}명</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">고령화율 차이</div>
              <div className="summary-value">{formatPercent(populationDiff.agingRatioDiff)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">대표 후보</div>
              <div className="summary-value">
                {electionDiff.leftTop?.candidateName ?? '-'} / {electionDiff.rightTop?.candidateName ?? '-'}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
