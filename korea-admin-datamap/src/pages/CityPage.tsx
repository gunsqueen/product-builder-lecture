import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from '@/components/common/StatePanel'
import { ElectionResultChart } from '@/components/ElectionResultChart'
import { ElectionSummaryCard } from '@/components/ElectionSummaryCard'
import { PopulationMiniChart } from '@/components/PopulationMiniChart'
import { PopulationSummaryCard } from '@/components/PopulationSummaryCard'
import { RegionSearchBox } from '@/components/RegionSearchBox'
import { SourceMetaGrid } from '@/components/common/SourceMetaGrid'
import { AdminMap } from '@/components/map/AdminMap'
import { StatCard } from '@/components/common/StatCard'
import { ROUTES } from '@/config/routes'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useJoinValidation, useJoinValidationLogger } from '@/hooks/useJoinValidation'
import { getCityByCode, listTownsByCity } from '@/services/adminDataService'
import { loadTownBoundaries } from '@/services/boundaryDataService'
import {
  getDefaultElectionId,
  getElectionResultByCode,
  getElectionResultsForAdminCode,
} from '@/services/electionDataService'
import {
  getCityPopulationByCode,
  getPopulationStats,
} from '@/services/populationDataService'
import {
  getElectionTimeSeries,
  getPopulationTimeSeries,
} from '@/services/timeSeriesService'
import { createAdminCodeLookup } from '@/utils/adminCodes'
import { formatPercent, formatPopulation } from '@/utils/formatters'
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

export function CityPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { provinceCode = '', cityCode = '' } = useParams()
  const selectedTownCode = searchParams.get('selectedTown') ?? undefined
  const cityState = useAsyncData(() => getCityByCode(cityCode), [cityCode])
  const townsState = useAsyncData(() => listTownsByCity(cityCode), [cityCode])
  const townBoundariesState = useAsyncData(() => loadTownBoundaries(cityCode), [cityCode])
  const populationState = useAsyncData(() => getPopulationStats('town', cityCode), [cityCode])
  const cityPopulationState = useAsyncData(() => getCityPopulationByCode(cityCode), [cityCode])
  const defaultElectionIdState = useAsyncData(() => getDefaultElectionId('city'), [])
  const electionState = useAsyncData(
    () =>
      defaultElectionIdState.data
        ? getElectionResultByCode(cityCode, defaultElectionIdState.data)
        : Promise.resolve(null),
    [cityCode, defaultElectionIdState.data],
  )
  const electionResultsState = useAsyncData(
    () =>
      defaultElectionIdState.data
        ? getElectionResultsForAdminCode(cityCode, defaultElectionIdState.data)
        : Promise.resolve([]),
    [cityCode, defaultElectionIdState.data],
  )
  const populationTrendState = useAsyncData(
    () => getPopulationTimeSeries(cityCode, 'totalPopulation'),
    [cityCode],
  )
  const agingTrendState = useAsyncData(
    () => getPopulationTimeSeries(cityCode, 'agingRate'),
    [cityCode],
  )
  const turnoutTrendState = useAsyncData(
    () => getElectionTimeSeries(cityCode, 'turnoutRate'),
    [cityCode],
  )

  const joinResult = useJoinValidation({
    datasetName: 'population',
    boundaryName: `${cityCode}-town`,
    boundaries: townBoundariesState.data,
    records: populationState.data ?? [],
  })

  useJoinValidationLogger(joinResult)

  const electionJoinResult = useMemo(
    () =>
      validateDatasetCodeJoin({
        datasetName: 'election',
        boundaryName: `${cityCode}-city`,
        contextLabel: defaultElectionIdState.data ?? undefined,
        referenceName: 'population',
        boundaryCodes: cityCode ? [cityCode] : [],
        records: electionResultsState.data ?? [],
        referenceCodes: cityPopulationState.data ? [cityPopulationState.data.adminCode] : [],
      }),
    [cityCode, cityPopulationState.data, defaultElectionIdState.data, electionResultsState.data],
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

    console.info('[CityPage:town-boundaries]', {
      route: `/province/${provinceCode}/city/${cityCode}`,
      selectedCityCode: cityCode,
      sourceType: townBoundariesState.data?.metadata?.sourceType,
      geometrySource: townBoundariesState.data?.metadata?.geometrySource,
      loadedFeatureCount,
      renderedFeatureCount: loadedFeatureCount,
      visibleFeatureCount,
      townListCount: townsState.data?.length ?? 0,
      loading: townBoundariesState.loading,
      error: townBoundariesState.error,
    })
  }, [
    cityCode,
    provinceCode,
    townBoundariesState.data,
    townBoundariesState.error,
    townBoundariesState.loading,
    townsState.data,
  ])

  if (cityState.loading) {
    return <section className="page"><LoadingPanel message="시군구 정보를 불러오는 중입니다." /></section>
  }

  if (cityState.error) {
    return <section className="page"><ErrorPanel message={cityState.error} /></section>
  }

  if (!cityState.data) {
    return <section className="page"><EmptyPanel message="해당 시군구를 찾을 수 없습니다." /></section>
  }

  const populationLookup = createAdminCodeLookup(
    populationState.data ?? [],
    (record) => record.totalPopulation,
  )
  const detailError =
    townBoundariesState.error ?? populationState.error

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{cityState.data.code}</span>
          <h1>{cityState.data.name}</h1>
        </div>
        <p>
          `{provinceCode}` 하위 시군구 페이지입니다. 하위 레벨은 법정동이 아니라
          행정동 기준 master를 사용하며, 경계는 SGIS real 우선 후 일부 snapshot만 fallback으로 연결됩니다.
        </p>
      </div>

      <div className="hero-metrics">
        <StatCard
          label="행정유형"
          value={cityState.data.adminType}
          description="district / city / county / special"
        />
        <StatCard
          label="행정동 기준"
          value={`${cityState.data.townCount}개`}
          description="실제 행정동 master 기준 개수"
        />
        <StatCard
          label="최근 선거"
          value={electionState.data ? electionState.data.partyName : '준비중'}
          description={
            electionState.data ? formatPercent(electionState.data.voteRate) : 'mock 연결 대기'
          }
        />
      </div>

      <SourceMetaGrid
        items={[
          {
            label: '인구',
            sourceType: cityPopulationState.data?.sourceType,
            sourceDate: cityPopulationState.data?.sourceDate,
            description: '시군구 요약 카드와 동일한 기준일입니다.',
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

      <div className="card-grid">
        <PopulationSummaryCard
          title="시군구 인구 요약"
          record={cityPopulationState.data}
          primaryMetric="seniorRatio"
        />
        <PopulationMiniChart record={cityPopulationState.data} />
        <ElectionSummaryCard title="상위 후보 득표율" result={electionState.data} />
        <ElectionResultChart results={electionResultsState.data ?? []} />
      </div>

      <div className="hero-metrics">
        <StatCard
          description="테마맵 핵심 지표"
          label="고령화율"
          value={formatPercent(calculateAgingRate(cityPopulationState.data))}
        />
        <StatCard
          description="테마맵 핵심 지표"
          label="20-39세 비율"
          value={formatPercent(calculateYouth2039Rate(cityPopulationState.data))}
        />
        <StatCard
          description="기본 선거 기준"
          label="투표율"
          value={
            electionState.data ? formatPercent(electionState.data.turnoutRate) : '준비중'
          }
        />
      </div>

      <div className="hero-metrics">
        <StatCard
          description="snapshot 시계열 기준"
          label="인구 변화율"
          value={formatPercent(calculatePopulationGrowthRate(populationTrendState.data ?? []))}
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

      <article className="panel">
        <div className="panel-head">
          <span className="eyebrow">추세 보기</span>
          <h2>{cityState.data.name} 시계열 비교</h2>
        </div>
        <div className="button-row">
          <Link
            className="button button-secondary"
            to={`${ROUTES.trends}?metric=totalPopulation&regionA=${cityCode}`}
          >
            인구 추세 보기
          </Link>
          <Link
            className="button button-secondary"
            to={`${ROUTES.trends}?metric=turnoutRate&regionA=${cityCode}`}
          >
            선거 추세 보기
          </Link>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <span className="eyebrow">하위 지역 검색</span>
          <h2>{cityState.data.name} 행정동 찾기</h2>
        </div>
        <RegionSearchBox
          levels={['town']}
          scopeCityCode={cityCode}
          title="행정동 검색"
        />
      </article>

      <div className="detail-grid">
        <div className="panel panel-stack">
          <div className="panel-head">
            <span className="eyebrow">행정동 상세</span>
            <h2>town lazy loading</h2>
          </div>
          {detailError ? (
            <ErrorPanel message={detailError} />
          ) : townBoundariesState.loading && !townBoundariesState.data ? (
            <LoadingPanel message="행정동 경계를 불러오는 중입니다." />
          ) : (
            <AdminMap
              data={townBoundariesState.data}
              debugLabel={`city-${cityCode}-towns`}
              emptyMessage="이 시군구는 아직 연결된 행정동 경계가 없습니다. 행정동 master와 route는 준비되어 있으며, SGIS real 또는 실제 snapshot이 연결되면 바로 표시됩니다."
              metricLookup={populationLookup}
              selectedCode={selectedTownCode}
              onFeatureClick={(townCode) =>
                navigate(ROUTES.town(provinceCode, cityCode, townCode))
              }
              height={460}
            />
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="eyebrow">행정동 리스트</span>
            <h2>행정동 엔트리</h2>
          </div>
          {(townsState.data ?? []).length > 0 ? (
            <ul className="admin-list">
              {(townsState.data ?? []).map((town) => (
                <li key={town.code}>
                  <Link
                    className="admin-list-link"
                    to={ROUTES.town(provinceCode, cityCode, town.code)}
                  >
                    <div>
                      <strong>{town.name}</strong>
                      <p>{town.townType} · 행정동 기준 population 연결</p>
                    </div>
                    <span>{formatPopulation(populationLookup[town.code] ?? 0)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="helper-text">
              행정동 실데이터는 `src/data/admin/towns.json`과
              `src/data/admin/adminDongLegalMappings.json` 기준으로 관리합니다. population join: {joinResult.status}
              {' '}· election join: {electionJoinResult.status}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
