import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/components/common/StatePanel'
import { ElectionComparisonChart } from '@/components/ElectionComparisonChart'
import { PopulationComparisonChart } from '@/components/PopulationComparisonChart'
import { RegionSearchBox } from '@/components/RegionSearchBox'
import { useAsyncData } from '@/hooks/useAsyncData'
import { compareRegions } from '@/services/comparisonService'
import type { RegionSearchResult } from '@/types/search'
import { formatNumber, formatPercent, formatPopulation } from '@/utils/formatters'

interface RegionComparisonPanelProps {
  regionA: RegionSearchResult | null
  regionB: RegionSearchResult | null
  onSelectRegionA: (region: RegionSearchResult) => void
  onSelectRegionB: (region: RegionSearchResult) => void
}

export function RegionComparisonPanel({
  regionA,
  regionB,
  onSelectRegionA,
  onSelectRegionB,
}: RegionComparisonPanelProps) {
  const comparisonState = useAsyncData(
    () =>
      regionA && regionB ? compareRegions(regionA, regionB) : Promise.resolve(null),
    [regionA?.adminCode, regionB?.adminCode],
  )

  return (
    <div className="stack">
      <div className="comparison-search-grid">
        <article className="panel">
          <div className="panel-head">
            <span className="eyebrow">Region A</span>
            <h2>{regionA?.name ?? '첫 번째 지역 선택'}</h2>
          </div>
          <RegionSearchBox
            autoNavigate={false}
            excludedAdminCodes={regionB ? [regionB.adminCode] : undefined}
            onSelect={onSelectRegionA}
            title="비교 지역 A"
          />
        </article>

        <article className="panel">
          <div className="panel-head">
            <span className="eyebrow">Region B</span>
            <h2>{regionB?.name ?? '두 번째 지역 선택'}</h2>
          </div>
          <RegionSearchBox
            autoNavigate={false}
            excludedAdminCodes={regionA ? [regionA.adminCode] : undefined}
            onSelect={onSelectRegionB}
            title="비교 지역 B"
          />
        </article>
      </div>

      {!regionA || !regionB ? (
        <EmptyPanel message="비교할 두 지역을 선택하면 인구와 선거 결과를 나란히 보여줍니다." />
      ) : comparisonState.error ? (
        <ErrorPanel message={comparisonState.error} />
      ) : comparisonState.loading && !comparisonState.data ? (
        <LoadingPanel message="비교 데이터를 불러오는 중입니다." />
      ) : comparisonState.data ? (
        <>
          <div className="hero-metrics">
            <article className="stat-card">
              <span className="eyebrow">인구 차이</span>
              <strong>{formatPopulation(Math.abs(comparisonState.data.populationComparison.totalPopulationDiff))}</strong>
              <p>
                {comparisonState.data.populationComparison.totalPopulationDiff >= 0
                  ? `${comparisonState.data.regionA.name}가 더 큼`
                  : `${comparisonState.data.regionB.name}가 더 큼`}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">고령화 비율 차이</span>
              <strong>{formatPercent(Math.abs(comparisonState.data.populationComparison.seniorRatioDiff))}</strong>
              <p>65세 이상 비율 기준</p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">상위 후보 득표율 차이</span>
              <strong>
                {comparisonState.data.electionComparison.voteRateDiff === null
                  ? '준비중'
                  : formatPercent(Math.abs(comparisonState.data.electionComparison.voteRateDiff))}
              </strong>
              <p>각 지역 기본 선거 기준</p>
            </article>
          </div>

          <div className="card-grid">
            <article className="panel">
              <span className="eyebrow">Population Summary</span>
              <h2>인구 요약</h2>
              <p>
                세대수 차이{' '}
                {formatNumber(
                  Math.abs(comparisonState.data.populationComparison.householdDiff),
                )}
                세대
              </p>
              <p>
                20-39세 비율 차이{' '}
                {formatPercent(
                  Math.abs(
                    comparisonState.data.populationComparison.youngAdultRatioDiff,
                  ),
                )}
              </p>
            </article>

            <article className="panel">
              <span className="eyebrow">Election Summary</span>
              <h2>선거 요약</h2>
              <p>
                {comparisonState.data.regionA.name}:{' '}
                {comparisonState.data.electionComparison.topResultA?.partyName ?? '없음'}{' '}
                {comparisonState.data.electionComparison.topResultA
                  ? formatPercent(comparisonState.data.electionComparison.topResultA.voteRate)
                  : ''}
              </p>
              <p>
                {comparisonState.data.regionB.name}:{' '}
                {comparisonState.data.electionComparison.topResultB?.partyName ?? '없음'}{' '}
                {comparisonState.data.electionComparison.topResultB
                  ? formatPercent(comparisonState.data.electionComparison.topResultB.voteRate)
                  : ''}
              </p>
            </article>
          </div>

          <div className="card-grid">
            <PopulationComparisonChart comparison={comparisonState.data.populationComparison} />
            <ElectionComparisonChart comparison={comparisonState.data.electionComparison} />
          </div>
        </>
      ) : null}
    </div>
  )
}
