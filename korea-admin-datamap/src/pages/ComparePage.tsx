import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RegionComparisonPanel } from '@/components/RegionComparisonPanel'
import { ROUTES } from '@/config/routes'
import type { RegionSearchResult } from '@/types/search'

export function ComparePage() {
  const [regionA, setRegionA] = useState<RegionSearchResult | null>(null)
  const [regionB, setRegionB] = useState<RegionSearchResult | null>(null)

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">지역 비교</span>
          <h1>인구 및 선거 비교</h1>
        </div>
        <p>
          두 지역을 선택하면 인구 규모, 고령화 비율, 주요 선거 결과를 같은 화면에서
          비교합니다. 검색은 admin master 데이터 기반으로 동작합니다.
        </p>
        <div className="button-row">
          <Link className="button button-secondary" to={ROUTES.trends}>
            시계열 비교로 이동
          </Link>
        </div>
      </div>

      <RegionComparisonPanel
        onSelectRegionA={setRegionA}
        onSelectRegionB={setRegionB}
        regionA={regionA}
        regionB={regionB}
      />
    </section>
  )
}
