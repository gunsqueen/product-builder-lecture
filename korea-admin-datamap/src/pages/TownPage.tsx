import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ElectionSummaryCard } from '@/components/ElectionSummaryCard'
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from '@/components/common/StatePanel'
import { SourceMetaGrid } from '@/components/common/SourceMetaGrid'
import { AdminMap } from '@/components/map/AdminMap'
import { PopulationMiniChart } from '@/components/PopulationMiniChart'
import { PopulationSummaryCard } from '@/components/PopulationSummaryCard'
import { StatCard } from '@/components/common/StatCard'
import { ROUTES } from '@/config/routes'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getTownByCode } from '@/services/adminDataService'
import { loadTownBoundaries } from '@/services/boundaryDataService'
import {
  getDefaultElectionId,
  getElectionResultByCode,
  getElectionResultsForAdminCode,
} from '@/services/electionDataService'
import { getPopulationByCode } from '@/services/populationDataService'
import {
  getElectionTimeSeries,
  getPopulationTimeSeries,
} from '@/services/timeSeriesService'
import { formatPopulation } from '@/utils/formatters'
import {
  logAdminJoinValidation,
  validateDatasetCodeJoin,
} from '@/utils/joinValidator'
import {
  calculateAgingRate,
  calculateYouth2039Rate,
} from '@/utils/metricCalculators'
import {
  calculateAgingRateChange,
  calculatePopulationGrowthRate,
  calculateTurnoutChange,
} from '@/utils/timeSeriesMetrics'

export function TownPage() {
  const navigate = useNavigate()
  const { provinceCode = '', cityCode = '', townCode = '' } = useParams()
  const townState = useAsyncData(() => getTownByCode(townCode), [townCode])
  const resolvedTownCode = townState.data?.code ?? townCode
  const resolvedCityCode = townState.data?.cityCode ?? cityCode
  const townBoundariesState = useAsyncData(
    () => loadTownBoundaries(resolvedCityCode),
    [resolvedCityCode],
  )
  const populationState = useAsyncData(() => getPopulationByCode(resolvedTownCode), [resolvedTownCode])
  const defaultElectionIdState = useAsyncData(() => getDefaultElectionId('town'), [])
  const electionState = useAsyncData(
    () =>
      defaultElectionIdState.data
        ? getElectionResultByCode(resolvedTownCode, defaultElectionIdState.data)
        : Promise.resolve(null),
    [defaultElectionIdState.data, resolvedTownCode],
  )
  const electionResultsState = useAsyncData(
    () =>
      defaultElectionIdState.data
        ? getElectionResultsForAdminCode(resolvedTownCode, defaultElectionIdState.data)
        : Promise.resolve([]),
    [defaultElectionIdState.data, resolvedTownCode],
  )
  const populationTrendState = useAsyncData(
    () => getPopulationTimeSeries(resolvedTownCode, 'totalPopulation'),
    [resolvedTownCode],
  )
  const agingTrendState = useAsyncData(
    () => getPopulationTimeSeries(resolvedTownCode, 'agingRate'),
    [resolvedTownCode],
  )
  const turnoutTrendState = useAsyncData(
    () => getElectionTimeSeries(resolvedTownCode, 'turnoutRate'),
    [resolvedTownCode],
  )

  const electionJoinResult = useMemo(
    () =>
      validateDatasetCodeJoin({
        datasetName: 'election',
        boundaryName: `${resolvedTownCode}-town`,
        contextLabel: defaultElectionIdState.data ?? undefined,
        referenceName: 'population',
        boundaryCodes: resolvedTownCode ? [resolvedTownCode] : [],
        records: electionResultsState.data ?? [],
        referenceCodes: populationState.data ? [populationState.data.adminCode] : [],
      }),
    [defaultElectionIdState.data, electionResultsState.data, populationState.data, resolvedTownCode],
  )

  useEffect(() => {
    logAdminJoinValidation(electionJoinResult)
  }, [electionJoinResult])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    const loadedFeatureCount = townBoundariesState.data?.features.length ?? 0
    const visibleFeatureCount =
      townBoundariesState.data?.features.filter((feature) => Boolean(feature.geometry?.type)).length ?? 0

    console.info('[TownPage:town-boundaries]', {
      route: `/province/${provinceCode}/city/${resolvedCityCode}/town/${resolvedTownCode}`,
      selectedTownCode: resolvedTownCode,
      sourceType: townBoundariesState.data?.metadata?.sourceType,
      geometrySource: townBoundariesState.data?.metadata?.geometrySource,
      loadedFeatureCount,
      renderedFeatureCount: loadedFeatureCount,
      visibleFeatureCount,
      loading: townBoundariesState.loading,
      error: townBoundariesState.error,
    })
  }, [
    provinceCode,
    resolvedCityCode,
    resolvedTownCode,
    townBoundariesState.data,
    townBoundariesState.error,
    townBoundariesState.loading,
  ])

  if (townState.loading) {
    return <section className="page"><LoadingPanel message="행정동 정보를 불러오는 중입니다." /></section>
  }

  if (townState.error) {
    return <section className="page"><ErrorPanel message={townState.error} /></section>
  }

  if (!townState.data) {
    return <section className="page"><EmptyPanel message="해당 행정동을 찾을 수 없습니다." /></section>
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{townState.data.code}</span>
          <h1>{townState.data.name}</h1>
        </div>
        <p>행정동 상세 라우트입니다. 화면 하위 레벨은 행정동 기준으로 정리되고, 법정동은 별도 매핑 데이터로 관리합니다.</p>
      </div>

      <div className="card-grid">
        <PopulationSummaryCard
          title="행정동 인구 요약"
          record={populationState.data}
          primaryMetric="youngAdultRatio"
        />
        <PopulationMiniChart record={populationState.data} />
        <ElectionSummaryCard title="간단 선거 결과" result={electionState.data} />
      </div>

      <SourceMetaGrid
        items={[
          {
            label: '인구',
            sourceType: populationState.data?.sourceType,
            sourceDate: populationState.data?.sourceDate,
            description: '행정동 요약 카드와 동일한 기준일입니다.',
          },
          {
            label: '선거',
            sourceType: electionState.data?.sourceType,
            sourceDate: electionState.data?.sourceDate,
            description: electionState.data?.electionName,
          },
          {
            label: '추세',
            sourceType: populationTrendState.data?.[populationTrendState.data.length - 1]?.sourceType,
            sourceDate: populationTrendState.data?.[populationTrendState.data.length - 1]?.sourceDate,
            description: 'snapshot 기반 시계열 추세',
          },
        ]}
      />

      <div className="hero-metrics">
        <StatCard
          description="테마맵 핵심 지표"
          label="고령화율"
          value={`${calculateAgingRate(populationState.data).toFixed(1)}%`}
        />
        <StatCard
          description="테마맵 핵심 지표"
          label="20-39세 비율"
          value={`${calculateYouth2039Rate(populationState.data).toFixed(1)}%`}
        />
        <StatCard
          description="기본 선거 기준"
          label="투표율"
          value={electionState.data ? `${electionState.data.turnoutRate.toFixed(1)}%` : '준비중'}
        />
      </div>

      <div className="hero-metrics">
        <StatCard
          description="snapshot 시계열 기준"
          label="인구 변화율"
          value={`${calculatePopulationGrowthRate(populationTrendState.data ?? []).toFixed(1)}%`}
        />
        <StatCard
          description="시계열 변화"
          label="고령화율 변화"
          value={`${calculateAgingRateChange(agingTrendState.data ?? []).toFixed(1)}%p`}
        />
        <StatCard
          description="최근 선거 추세"
          label="투표율 변화"
          value={`${calculateTurnoutChange(turnoutTrendState.data ?? []).toFixed(1)}%p`}
        />
      </div>

      <div className="card-grid">
        <article className="panel panel-stack">
          <div className="panel-head">
            <span className="eyebrow">행정동 경계</span>
            <h2>{townState.data.name} 지도</h2>
          </div>
          {townBoundariesState.error ? (
            <ErrorPanel message={townBoundariesState.error} />
          ) : townBoundariesState.loading && !townBoundariesState.data ? (
            <LoadingPanel message="행정동 경계를 불러오는 중입니다." />
          ) : (
            <AdminMap
              data={townBoundariesState.data}
              debugLabel={`town-${resolvedCityCode}-${resolvedTownCode}`}
              selectedCode={resolvedTownCode}
              height={420}
              emptyMessage="이 시군구의 행정동 경계를 아직 불러오지 못했습니다. SGIS real 또는 snapshot fallback이 연결되면 여기에 표시됩니다."
              onFeatureClick={(nextTownCode) =>
                navigate(ROUTES.town(provinceCode, resolvedCityCode, nextTownCode))
              }
            />
          )}
        </article>
        <article className="panel">
          <span className="eyebrow">현재 상태</span>
          <h2>기본 상세 정보</h2>
          <p>행정유형: {townState.data.townType}</p>
          <p>인구: {populationState.data ? formatPopulation(populationState.data.totalPopulation) : '준비중'}</p>
          <p>행정동 경계: {townState.data.hasBoundary ? '있음' : '없음'}</p>
          <p>선거 join: {electionJoinResult.status}</p>
        </article>

        <article className="panel">
          <span className="eyebrow">상위 이동</span>
          <h2>상위 라우트</h2>
          <div className="button-row">
            <Link
              className="button button-secondary"
              to={`${ROUTES.trends}?metric=totalPopulation&regionA=${resolvedTownCode}`}
            >
              추세 보기
            </Link>
            <Link className="button button-secondary" to={ROUTES.city(provinceCode, cityCode)}>
              시군구로
            </Link>
            <Link className="button button-secondary" to={ROUTES.province(provinceCode)}>
              시도로
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
